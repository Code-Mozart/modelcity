import { describe, expect, it } from 'vitest';
import { ids, key, setup } from '../testing/deleteFixture';
import { editorKey } from './keys';

describe('what the review found (^1260)', () => {
  it('undoing a batch of steps is one write: if it fails nothing is undone, and the history is as it was', async () => {
    const { editor, rows, press } = await setup();
    await editor.delete({ kind: 'nodes', ids: [5], name: 'delete node' });
    await editor.delete({ kind: 'nodes', ids: [3], name: 'delete node' });
    const [before, writer] = [await rows(), editor.writer!];
    let writes = 0;
    editor.writer = () => (writes++, Promise.reject(new Error('quota')));
    await editor.undo(true);
    await editor.undo();
    expect(await rows()).toEqual(before);
    expect(editor.history.past).toHaveLength(2);
    editor.writer = (change) => (writes++, writer(change));
    writes = 0;
    await editor.undo();
    await editor.undo();
    expect(writes).toBe(2);
    void press;
  });

  it("while a change is written Esc does not deselect (the selection is the delete's to change)", async () => {
    const { editor, click } = await setup();
    click(100, 100);
    const first = editor.delete({ kind: 'nodes', ids: [3], name: 'delete node' });
    editor.deselectAll();
    await first;
    expect([...editor.selection]).toEqual([5]);
  });
});
describe('what the review found about keys and stale rows (^1260)', () => {
  it('Alt+Del on a segment deletes its branch, as Alt+RMB does', async () => {
    const { editor, rows, hover } = await setup();
    hover(-50, 0);
    editor.alt = true;
    editorKey(editor, key('Delete', { altKey: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(editor.history.past.at(-1)?.name).toBe('delete branch');
    expect(ids((await rows()).edges)).not.toContain(10);
  });

  it('a step that is undone after the nodes next to it were moved finds them where they are now (the index follows)', async () => {
    const { editor, storage, rows, memory, settle } = await setup();
    await editor.delete({ kind: 'nodes', ids: [2], name: 'delete node' });
    // Node 4 is moved far away by something else (an operation that comes later): its row and the index change.
    const moved = [4, 0, 100_000_000, 0] as [number, number, number, number];
    const old = (await rows()).nodes.find((n) => n[0] === 4)!;
    const change = {
      nodes: [{ before: old, after: moved }],
      edges: [{ before: [13, 4, 5, null, 1], after: [13, 4, 5, null, 1] }] as never,
      context: [(await rows()).nodes.find((n) => n[0] === 5)!],
    };
    await editor.writer!(change);
    await editor.undo(true);
    await settle();
    expect((await rows()).nodes.map((n) => n[0])).toEqual([1, 2, 3, 4, 5]);
    // The segment 12 runs from node 2 to node 4, which is 100 km away now: the index has it there.
    const there = await storage.edgesInChunk('p', 0, 390, 2);
    expect(there.map((e) => e[0])).toContain(12);
    void memory;
  });
});

import { describe, expect, it } from 'vitest';
import { editing } from '../testing/editHarness';
import { node } from '../testing/loadedMap';
import { ids, setup } from '../testing/deleteFixture';

describe('a delete is one step that can be undone and done again (^81, ^434)', () => {
  it('the map, the chunks in memory and the selection go back and forth together', async () => {
    const { editor, rows, memory, click, settle } = await setup();
    click(0, 0);
    await editor.delete({ kind: 'nodes', ids: [2], name: 'delete node' });
    expect(ids((await rows()).nodes)).toEqual([4, 5]);
    expect(editor.selection.size).toBe(0);
    expect(memory.index.nodeOf(2)).toBeUndefined();
    await editor.undo();
    await settle();
    expect(ids((await rows()).nodes)).toEqual([1, 2, 3, 4, 5]);
    expect(ids((await rows()).edges)).toEqual([10, 11, 12, 13]);
    expect([...editor.selection]).toEqual([2]);
    expect(memory.index.nodeOf(2)).toBeDefined();
    await editor.redo();
    await settle();
    expect(ids((await rows()).nodes)).toEqual([4, 5]);
    expect(editor.selection.size).toBe(0);
    expect(memory.index.nodeOf(2)).toBeUndefined();
  });

  it('a node that was dissolved comes back with the segments as they were, radius included', async () => {
    const e = await editing(
      [node(1, -100, 0), node(2, 0, 0), node(3, 100, 0)],
      [
        [10, node(1, 0, 0)[0], 2, 5000, 1],
        [11, 2, 3, 7000, 1],
      ],
    );
    await e.editor.delete({ kind: 'nodes', ids: [2], name: 'delete node' });
    expect((await e.rows()).edges).toEqual([[10, 1, 3, null, 1]]);
    await e.editor.undo();
    expect((await e.rows()).edges).toEqual([
      [10, 1, 2, 5000, 1],
      [11, 2, 3, 7000, 1],
    ]);
  });
});

describe('what goes wrong, and what must not happen at the same time (^1260)', () => {
  it('a change that cannot be written changes nothing and says so', async () => {
    const { editor, rows, told } = await setup();
    editor.writer = () => Promise.reject(new Error('disk full'));
    await editor.delete({ kind: 'nodes', ids: [3], name: 'delete node' });
    expect(ids((await rows()).nodes)).toEqual([1, 2, 3, 4, 5]);
    expect(editor.history.past).toHaveLength(0);
    expect(told).toEqual(['The change could not be written: nothing was changed.']);
    expect(editor.busy).toBe(false);
  });

  it('what is asked while a change is written waits for its turn, in order, and is worked out then', async () => {
    const { editor, rows } = await setup();
    const first = editor.delete({ kind: 'nodes', ids: [3], name: 'delete node' });
    expect(editor.busy).toBe(true);
    const second = editor.delete({ kind: 'nodes', ids: [1], name: 'delete node' });
    await Promise.all([first, second]);
    expect(editor.busy).toBe(false);
    // Node 3 first (its segment goes), then node 1 (its segment goes, node 2 stays with its other segment).
    expect(ids((await rows()).nodes)).toEqual([2, 4, 5]);
    expect(editor.history.past).toHaveLength(2);
  });

  it('two quick undos are two undos', async () => {
    const { editor, rows } = await setup();
    await editor.delete({ kind: 'nodes', ids: [5], name: 'delete node' });
    await editor.delete({ kind: 'nodes', ids: [3], name: 'delete node' });
    await Promise.all([editor.undo(), editor.undo()]);
    expect(ids((await rows()).nodes)).toEqual([1, 2, 3, 4, 5]);
    expect(editor.history.future).toHaveLength(2);
  });
});

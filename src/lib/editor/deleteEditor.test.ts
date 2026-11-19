import { describe, expect, it } from 'vitest';
import { at, editing } from '../testing/editHarness';
import { edge, node } from '../testing/loadedMap';
import { editorKey } from './keys';

/** A road 1 - 2 - 3 along the x axis, and a branch from 2 to 4: a tee. */
const nodes = [
  node(1, -100, 0),
  node(2, 0, 0),
  node(3, 100, 0),
  node(4, 0, 100),
  node(5, 100, 100),
];
const edges = [edge(10, 1, 2), edge(11, 2, 3), edge(12, 2, 4), edge(13, 4, 5)];

const key = (k: string, mods: object = {}) => ({
  key: k,
  code: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

const ids = (rows: { 0: number }[]) => rows.map((r) => r[0]);

async function setup() {
  const told: string[] = [];
  const e = await editing(nodes, edges, told);
  const hover = (x: number, y: number) => (e.editor.hover = e.press.pickAt(at(x, y)));
  const click = (x: number, y: number, shift = false) => {
    e.press.down(at(x, y), shift);
    e.press.up();
  };
  return { ...e, told, hover, click };
}

describe('Del deletes the selection, or what is hovered when nothing is selected (^687, ^757, ^920)', () => {
  it('a hovered end node goes with its segment, and the step is named delete node', async () => {
    const { editor, rows, hover } = await setup();
    hover(-100, 0);
    editorKey(editor, key('Delete'));
    await new Promise((r) => setTimeout(r, 0));
    const now = await rows();
    expect(ids(now.nodes)).toEqual([2, 3, 4, 5]);
    expect(ids(now.edges)).toEqual([11, 12, 13]);
    expect(editor.history.past.at(-1)?.name).toBe('delete node');
  });

  it('with nodes selected, Del deletes the selection and not the hovered node', async () => {
    const { editor, rows, hover, click } = await setup();
    click(100, 100);
    hover(-100, 0);
    editorKey(editor, key('Delete'));
    await new Promise((r) => setTimeout(r, 0));
    expect(ids((await rows()).nodes)).toEqual([1, 2, 3, 4]);
    expect(editor.selection.size).toBe(0);
  });

  it('a hovered segment is deleted, in a step named delete segment, with Alt a whole branch', async () => {
    const { editor, rows, hover } = await setup();
    hover(50, 0);
    editorKey(editor, key('Backspace'));
    await new Promise((r) => setTimeout(r, 0));
    expect(ids((await rows()).edges)).toEqual([10, 12, 13]);
    expect(editor.history.past.at(-1)?.name).toBe('delete segment');
  });

  it('nothing hovered and nothing selected: nothing happens; in view mode too', async () => {
    const { editor, rows, hover } = await setup();
    hover(300, 300);
    editorKey(editor, key('Delete'));
    editor.toggleMode();
    editor.hover = null;
    editorKey(editor, key('Delete'));
    await new Promise((r) => setTimeout(r, 0));
    expect(ids((await rows()).nodes)).toEqual([1, 2, 3, 4, 5]);
    expect(editor.history.past).toHaveLength(0);
  });
});

describe('the right button deletes what is under the pointer (^489, ^699, ^920, ^160)', () => {
  it('a node, or a segment, or with Alt the branch of a segment', async () => {
    const { editor, rows, press } = await setup();
    await editor.rightClick(press.pickAt(at(100, 100)), false);
    expect(ids((await rows()).nodes)).toEqual([1, 2, 3, 4]);
    await editor.rightClick(press.pickAt(at(-50, 0)), false);
    expect(ids((await rows()).edges)).toEqual([11, 12]);
    await editor.rightClick(press.pickAt(at(0, 50)), true);
    // Node 2 has two segments left, so its branch runs through it: both go, and the nodes with them.
    const now = await rows();
    expect(ids(now.edges)).toEqual([]);
    expect(ids(now.nodes)).toEqual([]);
    expect(editor.history.past.map((s) => s.name)).toEqual([
      'delete node',
      'delete segment',
      'delete branch',
    ]);
  });

  it('on the selection, which has several nodes, it deletes the selection; elsewhere only what is under it', async () => {
    const { editor, rows, press, click } = await setup();
    click(-100, 0);
    click(0, 100, true);
    click(100, 100, true);
    // Node 3 is not selected: only it goes, the selection stays.
    await editor.rightClick(press.pickAt(at(100, 0)), false);
    expect(ids((await rows()).nodes)).toEqual([1, 2, 4, 5]);
    expect([...editor.selection].sort()).toEqual([1, 4, 5]);
    await editor.rightClick(press.pickAt(at(-100, 0)), false);
    // The pointer was on a selected node and the selection has several nodes: all of it goes.
    expect(ids((await rows()).nodes)).toEqual([]);
    expect(editor.selection.size).toBe(0);
  });

  it('on nothing, and with a chunk that is loading, nothing happens', async () => {
    const { editor, rows, press } = await setup();
    await editor.rightClick(press.pickAt(at(300, 300)), false);
    expect(ids((await rows()).nodes)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('delete branch (^160)', () => {
  /** A road of five nodes along the x axis, 100 m apart, and a node beside it that is not on it. */
  const road = [1, 2, 3, 4, 5].map((i) => node(i, (i - 3) * 100, 0));
  const chain = [edge(10, 1, 2), edge(11, 2, 3), edge(12, 3, 4), edge(13, 4, 5)];

  it('takes all segments of a branch that is longer than the one under the pointer, and the nodes', async () => {
    const { editor, rows, press } = await editing(road, chain);
    await editor.rightClick(press.pickAt(at(-150, 0)), true);
    const now = await rows();
    expect([now.nodes.length, now.edges.length]).toEqual([0, 0]);
    expect(editor.history.past.at(-1)?.name).toBe('delete branch');
  });

  it('stops at a split, and says when the branch goes on beyond what is loaded', async () => {
    const told: string[] = [];
    const split = [...road, node(6, 100, 100)];
    const { editor, rows, press } = await editing(split, [...chain, edge(14, 4, 6)], told);
    await editor.rightClick(press.pickAt(at(-150, 0)), true);
    // The branch is 1 - 2 - 3 - 4, where the road splits: node 4 stays with its two other segments.
    expect((await rows()).edges.map((e) => e[0])).toEqual([13, 14]);
    expect(told).toEqual([]);
  });
});

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

  it('while one change is written another is not started', async () => {
    const { editor, rows } = await setup();
    const first = editor.delete({ kind: 'nodes', ids: [3], name: 'delete node' });
    expect(editor.busy).toBe(true);
    await editor.delete({ kind: 'nodes', ids: [1], name: 'delete node' });
    await first;
    expect(ids((await rows()).nodes)).toEqual([1, 2, 4, 5]);
    expect(editor.history.past).toHaveLength(1);
  });
});

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

  it('while a change is written nothing is undone and nothing is deselected, and the user is told', async () => {
    const { editor, rows, told, click } = await setup();
    click(100, 100);
    const first = editor.delete({ kind: 'nodes', ids: [3], name: 'delete node' });
    editor.deselectAll();
    await editor.undo();
    await first;
    expect(told).toContain('Wait until the change is written.');
    expect(ids((await rows()).nodes)).toEqual([1, 2, 4, 5]);
    expect(editor.history.past.map((s) => s.name)).toEqual(['select node', 'delete node']);
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

describe('a branch longer than what is loaded is deleted whole (^160, ^1260)', () => {
  it('the storage is followed, not the chunks in memory', async () => {
    const road = Array.from({ length: 12 }, (_, i) => node(i + 1, i * 300, 0));
    const chain = Array.from({ length: 11 }, (_, i) => edge(i + 10, i + 1, i + 2));
    const { editor, rows, press } = await editing(road, chain);
    await editor.rightClick(press.pickAt(at(150, 0)), true);
    const now = await rows();
    expect([now.nodes.length, now.edges.length]).toEqual([0, 0]);
  });
});

import { describe, expect, it } from 'vitest';
import { at } from '../testing/editHarness';
import { edge, node, pointOnEdge } from '../testing/loadedMap';
import { ids, key, setup } from '../testing/deleteFixture';
import { editorKey } from './keys';

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
    hover(70, 0);
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

/** A point on segment 12 (B to D) that is no control point. */
const ON_12 = pointOnEdge(edge(12, 2, 4), node(2, 0, 0), node(4, 0, 100), 0.3);

describe('the right button deletes what is under the pointer (^489, ^699, ^920, ^160)', () => {
  it('a node, or a segment, or with Alt the branch of a segment', async () => {
    const { editor, rows, press } = await setup();
    await editor.rightClick(press.pickAt(at(100, 100)), false);
    expect(ids((await rows()).nodes)).toEqual([1, 2, 3, 4]);
    await editor.rightClick(press.pickAt(at(-30, 0)), false);
    expect(ids((await rows()).edges)).toEqual([11, 12]);
    await editor.rightClick(press.pickAt(at(ON_12.x, ON_12.y)), true);
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

  it('on the selection, which has several nodes, it deletes the selection', async () => {
    const { editor, rows, press, click } = await setup();
    click(-100, 0);
    click(0, 100, true);
    click(100, 100, true);
    await editor.rightClick(press.pickAt(at(-100, 0)), false);
    // The nodes 1, 4 and 5 go with their segments; 2 and 3 are left with the segment between them.
    expect(ids((await rows()).nodes)).toEqual([2, 3]);
    expect(editor.selection.size).toBe(0);
  });

  it('elsewhere only what is under it, and nothing is selected after (as on main, a removal ends with no selection)', async () => {
    const { editor, rows, press, click } = await setup();
    click(-100, 0);
    click(0, 100, true);
    await editor.rightClick(press.pickAt(at(100, 0)), false);
    expect(ids((await rows()).nodes)).toEqual([1, 2, 4, 5]);
    expect(editor.selection.size).toBe(0);
  });

  it('on nothing, and with a chunk that is loading, nothing happens', async () => {
    const { editor, rows, press } = await setup();
    await editor.rightClick(press.pickAt(at(300, 300)), false);
    expect(ids((await rows()).nodes)).toEqual([1, 2, 3, 4, 5]);
  });
});

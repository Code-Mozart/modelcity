import { describe, expect, it } from 'vitest';
import { at } from '../testing/editHarness';
import { moving } from '../testing/moveFixture';
import { editorKey } from './keys';
import { gripOf } from './movePress';

const esc = {
  key: 'Escape',
  code: '',
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
};

describe('moving in select mode (^71, ^72, ^1265)', () => {
  it('a node that is not selected is selected when it is dragged, in the same step; undo puts both back', async () => {
    const m = await moving();
    await m.drag({ x: -100, y: 0 }, { x: -100, y: -40 });
    expect([...m.editor.selection]).toEqual([3]);
    expect(m.editor.history.past.map((s) => s.name)).toEqual(['move node']);
    await m.editor.undo();
    expect(m.editor.selection.size).toBe(0);
    expect((await m.row(3))?.[2]).toBe(0);
    await m.editor.redo();
    expect([...m.editor.selection]).toEqual([3]);
    expect((await m.row(3))?.[2]).toBe(-40_000);
  });

  it('a selected node moves the whole selection by as much (`move N nodes`)', async () => {
    const m = await moving();
    m.editor.follow(new Set([1, 3]));
    await m.drag({ x: -100, y: 0 }, { x: -100, y: 30 });
    expect((await m.row(1))?.slice(1, 3)).toEqual([0, 30_000]);
    expect((await m.row(3))?.slice(1, 3)).toEqual([-100_000, 30_000]);
    expect(m.editor.history.past.at(-1)?.name).toBe('move 2 nodes');
  });
});

describe('merging and cancelling a drag (^248, ^268, ^295, ^286)', () => {
  it('a node let go on another node merges into it (^248); on a curve it is inserted there (^268)', async () => {
    const m = await moving();
    await m.drag({ x: -100, y: 0 }, { x: 1, y: 1 });
    const r = await m.rows();
    expect(r.nodes.map((n) => n[0])).toEqual([1, 2]);
    expect(r.edges.map((e) => e.slice(0, 3))).toEqual([[10, 1, 2]]);
    const c = await moving();
    await c.drag({ x: -100, y: 0 }, { x: 70.71, y: 29.29 });
    expect((await c.rows()).edges.map((e) => e.slice(0, 3))).toEqual([
      [10, 1, 4],
      [11, 4, 1],
      [12, 4, 2],
    ]);
  });

  it('Esc while dragging cancels it: nothing is written, nothing is drawn over the map (^295)', async () => {
    const m = await moving();
    const grip = gripOf(m.press.pickAt(at(-100, 0)))!;
    m.move.grab(grip, at(-100, 0), false);
    m.move.move(at(-100, -50), false);
    expect(m.editor.draft).not.toBe(null);
    m.editor.cancelPress = () => m.move.cancel();
    editorKey(m.editor, esc);
    m.move.up();
    await m.settle();
    expect(m.editor.draft).toBe(null);
    expect(m.editor.history.past).toHaveLength(0);
    expect((await m.row(3))?.[2]).toBe(0);
  });

  it('while a node is dragged over a node it would merge into, that node is the hover and the hint says so', async () => {
    const m = await moving();
    const grip = gripOf(m.press.pickAt(at(-100, 0)))!;
    m.move.grab(grip, at(-100, 0), false);
    m.move.move(at(0, 2), false);
    expect(m.editor.hover).toEqual({ kind: 'node', id: 1 });
    expect(m.editor.drag?.merges).toBe(true);
    m.move.cancel();
    expect(m.editor.drag).toBe(null);
  });
});

describe('moving in draw mode (^1265)', () => {
  it('a node is moved without selecting it; the road drawn follows a node that merges', async () => {
    const m = await moving('draw');
    m.draw.down(at(-100, 0), false);
    m.draw.up();
    await m.settle();
    expect(m.editor.draw.active).toBe(3);
    await m.drag({ x: -100, y: 0 }, { x: 1, y: -1 });
    expect(m.editor.selection.size).toBe(0);
    expect(m.editor.draw.active).toBe(1);
    expect((await m.rows()).nodes.map((n) => n[0])).toEqual([1, 2]);
  });
});

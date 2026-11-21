import { describe, expect, it } from 'vitest';
import type { Size, View } from '../camera/view';
import { edge, loaded, node } from '../testing/loadedMap';
import { Editor } from './editor.svelte';
import { BRANCH_TEXT, SelectPress, WAITING_TEXT } from './selectPress';

const size: Size = { width: 400, height: 400 };
/** The world point (x, y) is at (x + 200, y + 200) on the screen. */
const view: View = { cx: 0, cy: 0, scale: 1, rot: 0, gx: 0, gy: 0 };
const at = (x: number, y: number) => ({ x: x + 200, y: y + 200 });

function setup(loading: string[] = []) {
  const map = loaded([node(1, -50, 0), node(2, 50, 0), node(3, 0, 60)], [edge(7, 1, 2)], loading);
  const editor = new Editor();
  const told: string[] = [];
  editor.told = (_, text) => told.push(text);
  const press = new SelectPress(editor, {
    map: () => map,
    screen: () => ({ view, size }),
  });
  return { editor, press, told };
}

const click = (press: SelectPress, p: { x: number; y: number }, shift = false) => {
  press.down(p, shift);
  press.up();
};
const drag = (
  press: SelectPress,
  a: { x: number; y: number },
  b: { x: number; y: number },
  shift = false,
) => {
  press.down(a, shift);
  press.move(b);
  press.up();
};

describe('the left button in select mode (^1257)', () => {
  it('a click on a node selects it, also instead of what was selected; with Shift it toggles', () => {
    const { editor, press } = setup();
    click(press, at(-50, 1));
    expect([...editor.selection]).toEqual([1]);
    click(press, at(50, 1));
    expect([...editor.selection]).toEqual([2]);
    click(press, at(-50, 1), true);
    expect([...editor.selection]).toEqual([2, 1]);
    click(press, at(-50, 1), true);
    expect([...editor.selection]).toEqual([2]);
  });

  it('a click on a segment selects its two nodes, a click on nothing deselects all', () => {
    const { editor, press } = setup();
    click(press, at(20, 2));
    expect([...editor.selection].sort()).toEqual([1, 2]);
    click(press, at(0, -100));
    expect(editor.selection.size).toBe(0);
    expect(editor.history.past.map((s) => s.name)).toEqual(['select 2 nodes', 'deselect all']);
  });
});

describe('the box of the left button (^1257, ^495, ^685)', () => {
  it('a drag from nothing is a box: the selection follows it and it is one step', () => {
    const { editor, press } = setup();
    press.down(at(-80, -20), false);
    press.move(at(80, 20));
    expect(editor.band).not.toBeNull();
    expect([...editor.selection].sort()).toEqual([1, 2]);
    press.move(at(80, -80));
    expect(editor.selection.size).toBe(0);
    press.move(at(80, 80));
    press.up();
    expect([...editor.selection].sort()).toEqual([1, 2, 3]);
    expect(editor.band).toBeNull();
    expect(editor.history.past.map((s) => s.name)).toEqual(['select 3 nodes']);
  });

  it('a box with Shift adds to what was selected before it began', () => {
    const { editor, press } = setup();
    click(press, at(0, 60));
    drag(press, at(-80, -20), at(80, 20), true);
    expect([...editor.selection].sort()).toEqual([1, 2, 3]);
  });
});

describe('what a press does not do (^1257)', () => {
  it('a small movement is still a click, and a drag that begins on a node does not make a box (yet)', () => {
    const { editor, press } = setup();
    press.down(at(-50, 1), false);
    press.move(at(-48, 2));
    press.up();
    expect([...editor.selection]).toEqual([1]);
    drag(press, at(50, 0), at(150, 150));
    expect(editor.band).toBeNull();
    expect([...editor.selection]).toEqual([1]);
  });

  it('a box over a chunk that is still loading selects the loaded ones and says so', () => {
    const { editor, press, told } = setup(['0,-1']);
    drag(press, at(-80, -100), at(80, 80));
    expect(told).toEqual([WAITING_TEXT]);
    expect(editor.selection.size).toBeGreaterThan(0);
  });

  it('what is under the pointer is hovered nowhere that is loading', () => {
    const { press } = setup(['-1,0', '0,0']);
    expect(press.pickAt(at(-50, 1))).toBeNull();
  });
});

/** A road 1 - 2 - 3 along the x axis that splits at 3 into 3 - 4 and 3 - 5. */
function treeSetup(loading: string[] = []) {
  const map = loaded(
    [node(1, -50, 0), node(2, 50, 0), node(3, 150, 0), node(4, 200, -50), node(5, 200, 50)],
    [edge(1, 1, 2), edge(2, 2, 3), edge(3, 3, 4), edge(4, 3, 5)],
    loading,
  );
  const editor = new Editor();
  const told: string[] = [];
  editor.told = (_, text) => told.push(text);
  const press = new SelectPress(editor, { map: () => map, screen: () => ({ view, size }) });
  return { editor, press, told };
}

describe('Alt+click selects a branch (^128, ^244, ^1258)', () => {
  it('on a node or a segment: its branch up to the split, the nodes at the ends included', () => {
    const { editor, press } = treeSetup();
    press.down(at(-50, 1), false, true);
    press.up();
    expect([...editor.selection].sort()).toEqual([1, 2, 3]);
    press.down(at(100, 1), false, true);
    press.up();
    expect(editor.selection.size).toBe(0);
  });

  it('a second Alt+click deselects it; with Shift the others stay, and a branch is added to them', () => {
    const { editor, press } = treeSetup();
    click(press, at(200, -50));
    press.down(at(-50, 1), true, true);
    press.up();
    expect([...editor.selection].sort()).toEqual([1, 2, 3, 4]);
    press.down(at(-50, 1), true, true);
    press.up();
    expect([...editor.selection]).toEqual([4]);
  });

  it('a branch that leaves what is loaded is followed as far as that, and the user is told', () => {
    const { editor, press, told } = treeSetup(['0,0']);
    press.down(at(-50, 1), false, true);
    press.up();
    expect([...editor.selection].sort()).toEqual([1, 2]);
    expect(told).toEqual([BRANCH_TEXT]);
  });

  it('Alt on nothing is a click on nothing', () => {
    const { editor, press } = treeSetup();
    click(press, at(-50, 1));
    press.down(at(0, -100), false, true);
    press.up();
    expect(editor.selection.size).toBe(0);
  });
});

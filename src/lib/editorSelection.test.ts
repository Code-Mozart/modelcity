import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at, click, draw } from './testing/editorHelpers';

/** Two roads of two nodes each, in select mode: nodes at (0,0), (20,0), (0,40), (20,40). */
function roads() {
  const ed = draw([
    [0, 0],
    [20, 0],
  ]);
  ed.key('Escape');
  click(ed, 0, 40);
  click(ed, 0, 40);
  click(ed, 20, 40);
  ed.key('Escape');
  return ed;
}

const nodes = (ed: Editor) => ed.roads.flatMap((p) => p.nodes.map((n) => [n.x, n.y]));

function band(ed: Editor, from: [number, number], to: [number, number], shift = false) {
  ed.pointerDown(at(from[0], from[1], { shift }));
  ed.pointerMove(at(to[0], to[1], { shift }));
  ed.pointerUp();
}

describe('selection box (^70)', () => {
  it('a drag on empty canvas selects the nodes inside, across roads', () => {
    const ed = roads();
    band(ed, [-5, -5], [25, 45]);
    expect(ed.selection).toHaveLength(4);
    band(ed, [-5, -5], [5, 5]);
    expect(ed.selection).toEqual([{ road: 0, node: 0 }]);
    expect(ed.drawing).toBe(false);
    expect(ed.band).toBeNull();
  });

  it('shows the box while dragging, whatever direction it is dragged in', () => {
    const ed = roads();
    ed.pointerDown(at(25, 45));
    ed.pointerMove(at(-5, -5));
    expect(ed.band).not.toBeNull();
    expect(ed.selection).toHaveLength(4);
    ed.pointerUp();
  });

  it('shift keeps the selection and adds to it; a click on empty canvas clears it and draws', () => {
    const ed = roads();
    band(ed, [-5, -5], [5, 5]);
    band(ed, [15, 35], [25, 45], true);
    expect(ed.selection).toHaveLength(2);
    click(ed, 100, 100);
    expect(ed.selection).toEqual([]);
    expect(ed.drawing).toBe(true);
  });

  it('Delete removes all selected nodes', () => {
    const ed = roads();
    band(ed, [-5, -5], [25, 5]);
    ed.key('Delete');
    expect(ed.roads).toHaveLength(1);
    expect(ed.selection).toEqual([]);
  });
});

describe('group move (^71)', () => {
  it('dragging a selected node moves all selected nodes by the same translation', () => {
    const ed = roads();
    band(ed, [-5, -5], [25, 5]);
    ed.pointerDown(at(0, 0));
    ed.pointerMove(at(10, 7));
    ed.pointerUp();
    expect(nodes(ed)).toEqual([
      [10, 7],
      [30, 7],
      [0, 40],
      [20, 40],
    ]);
  });

  it('works across roads and leaves unselected nodes alone', () => {
    const ed = roads();
    band(ed, [-5, 35], [5, 45]);
    ed.pointerDown(at(0, 0, { shift: true }));
    ed.pointerMove(at(3, 3, { shift: true }));
    ed.pointerUp();
    expect(nodes(ed)).toEqual([
      [3, 3],
      [20, 0],
      [3, 43],
      [20, 40],
    ]);
  });

  it('pressing an unselected node selects only it; a click on a group member narrows to it', () => {
    const ed = roads();
    band(ed, [-5, -5], [25, 5]);
    ed.pointerDown(at(0, 40));
    ed.pointerUp();
    expect(ed.selection).toEqual([{ road: 1, node: 0 }]);
    band(ed, [-5, -5], [25, 5]);
    click(ed, 20, 0);
    expect(ed.selection).toEqual([{ road: 0, node: 1 }]);
  });
});

describe('shift selects (^72)', () => {
  it('shift+click toggles a node', () => {
    const ed = roads();
    const toggle = () => {
      ed.pointerDown(at(0, 0, { shift: true }));
      ed.pointerUp();
    };
    toggle();
    expect(ed.selection).toEqual([{ road: 0, node: 0 }]);
    toggle();
    expect(ed.selection).toEqual([]);
  });

  it('shift+drag of an unselected node adds it to the selection', () => {
    const ed = roads();
    click(ed, 20, 0);
    ed.pointerDown(at(0, 0, { shift: true }));
    ed.pointerMove(at(1, 1, { shift: true }));
    ed.pointerUp();
    expect(ed.selection).toHaveLength(2);
  });

  it('a second finger undoes the selection change of the first', () => {
    const ed = roads();
    ed.pointerDown(at(0, 0));
    ed.cancelPress();
    expect(ed.selection).toEqual([]);
  });
});

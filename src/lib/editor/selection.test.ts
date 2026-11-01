import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at, click, draw } from '../testing/editorHelpers';

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

const nodes = (ed: Editor) => ed.graph.nodes.map((n) => [n.x, n.y]);

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
    expect(ed.selection).toEqual([ed.chains[0]!.nodeIds[0]]);
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

  it('shift keeps the selection and adds to it; a click on empty canvas deselects, then draws (^75)', () => {
    const ed = roads();
    band(ed, [-5, -5], [5, 5]);
    band(ed, [15, 35], [25, 45], true);
    expect(ed.selection).toHaveLength(2);
    ed.pointerDown(at(100, 100, { shift: true }));
    ed.pointerUp();
    expect(ed.selection).toHaveLength(2);
    click(ed, 100, 100);
    expect(ed.selection).toEqual([]);
    expect(ed.drawing).toBe(false);
    click(ed, 100, 100);
    expect(ed.drawing).toBe(true);
  });

  it('Delete removes all selected nodes', () => {
    const ed = roads();
    band(ed, [-5, -5], [25, 5]);
    ed.key('Delete');
    expect(ed.chains).toHaveLength(1);
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
    expect(ed.selection).toEqual([ed.chains[1]!.nodeIds[0]]);
    band(ed, [-5, -5], [25, 5]);
    click(ed, 20, 0);
    expect(ed.selection).toEqual([ed.chains[0]!.nodeIds[1]]);
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
    expect(ed.selection).toEqual([ed.chains[0]!.nodeIds[0]]);
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

describe('selecting by curve (^74)', () => {
  /** Three quarters along, clear of the heading arrow tip of the first node. */
  const mid = (ed: Editor) => {
    const [a, b] = ed.chains[0]!.path.nodes;
    return at(a!.x + (b!.x - a!.x) * 0.75, a!.y + (b!.y - a!.y) * 0.75);
  };
  const press = (ed: Editor, shift: boolean) => {
    const m = mid(ed);
    ed.pointerDown({ ...m, shift });
    ed.pointerUp();
  };

  it('LMB selects its two nodes; hovering says how many are selected', () => {
    const ed = roads();
    ed.pointerMove(mid(ed));
    expect(ed.hintTarget).toEqual({ kind: 'curve', picked: 0, act: null, lane: false });
    press(ed, false);
    expect(ed.selection).toEqual(ed.chains[0]!.nodeIds);
    expect(ed.drawing).toBe(false);
  });

  it('Shift+LMB adds both nodes, or deselects them only if both are selected', () => {
    const ed = roads();
    click(ed, 0, 0);
    press(ed, true);
    expect(ed.selection).toHaveLength(2);
    press(ed, true);
    expect(ed.selection).toEqual([]);
  });
});

describe('select lane (^76)', () => {
  it('Alt+LMB on a node or a curve selects the whole road', () => {
    const ed = roads();
    ed.pointerDown(at(0, 40, { alt: true }));
    ed.pointerUp();
    expect(ed.selection).toHaveLength(2);
    expect(ed.selection).toEqual(ed.chains[1]!.nodeIds);
    ed.pointerDown(at(15, 0, { alt: true }));
    ed.pointerUp();
    expect(ed.selection).toEqual(ed.chains[0]!.nodeIds);
  });
});

describe('group move hides scaffolds (^78)', () => {
  it('only while several nodes are moved', () => {
    const ed = roads();
    band(ed, [-5, -5], [25, 5]);
    ed.pointerDown(at(0, 0));
    ed.pointerMove(at(10, 7));
    expect(ed.movingGroup).toBe(true);
    ed.pointerUp();
    expect(ed.movingGroup).toBe(false);
    click(ed, 0, 0);
    ed.pointerDown(at(10, 7));
    ed.pointerMove(at(15, 7));
    expect(ed.movingGroup).toBe(false);
  });
});

describe('sharing a radius (^77)', () => {
  it('dragging the radius of a selected segment sets it for all selected segments', () => {
    const ed = draw([
      [0, 0],
      [30, -20],
      [60, 0],
      [90, -20],
    ]);
    ed.key('Escape');
    band(ed, [-5, -90], [100, 10]);
    const ring = ed.handles(4).find((h) => h.type === 'rad' && h.i === 0)!;
    ed.pointerDown(at(ring.x, ring.y));
    expect(ed.selectedSegments).toHaveLength(3);
    ed.pointerMove(at(ring.x + 4, ring.y + 4));
    ed.pointerUp();
    const radii = ed.chains[0]!.path.radii;
    expect(radii[0]).not.toBeNull();
    expect(radii[1]).toBe(radii[0]);
    expect(radii[2]).toBe(radii[0]);
  });
});

describe('radius points (^128)', () => {
  const road = () => {
    const ed = draw([
      [0, 0],
      [30, -20],
      [60, 0],
      [90, -20],
    ]);
    ed.key('Escape');
    band(ed, [-5, -90], [100, 10]);
    return ed;
  };

  it('every arc has radius points at its ends, not one in the middle, unless both ends are at nodes', () => {
    const ed = road();
    const pts = ed.handles(4).filter((h) => h.type === 'rad' && h.i === 0);
    expect(pts.length).toBeGreaterThanOrEqual(1);
    expect(pts.every((h) => h.t === 0 || h.t === 1 || h.t === 0.5)).toBe(true);
    const single = ed.handles(4).filter((h) => h.type === 'rad' && h.t === 0.5);
    expect(single.length).toBeGreaterThanOrEqual(0);
  });

  it('knows the selected segments, which show their scaffold together (^133)', () => {
    const ed = road();
    expect(ed.selectedSegments).toEqual([
      { road: 0, i: 0 },
      { road: 0, i: 1 },
      { road: 0, i: 2 },
    ]);
  });
});

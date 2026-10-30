import { describe, expect, it } from 'vitest';
import { closeOver, junctions } from './curves/junctions';
import { at, bareCurvePoint, click, draw } from './testing/editorHelpers';

/** Road 0 runs (0,0) - (40,-20) - (80,0), finished; draw mode, nothing being drawn. */
const base = () => {
  const ed = draw([
    [0, 0],
    [40, -20],
    [80, 0],
  ]);
  ed.key('Escape');
  click(ed, 500, 500);
  return ed;
};

describe('splitting (^23)', () => {
  it('a click on a node starts a new road that shares it; the next click draws its first edge', () => {
    const ed = base();
    click(ed, 40, -20);
    expect(ed.active).toBe(1);
    expect(ed.roads[1]!.nodes).toEqual([ed.roads[0]!.nodes[1]]);
    click(ed, 80, -60);
    expect(ed.roads[1]!.nodes).toHaveLength(2);
    expect(ed.roads[0]!.nodes).toHaveLength(3);
    expect(junctions(ed.roads)).toEqual([{ at: { road: 0, node: 1 }, incoming: 1, outgoing: 2 }]);
  });

  it('a click on a curve inserts a node there and starts a new road from it', () => {
    const ed = base();
    const mid = bareCurvePoint(ed);
    click(ed, mid.x, mid.y);
    expect(ed.roads[0]!.nodes).toHaveLength(4);
    expect(ed.active).toBe(1);
    expect(ed.roads[1]!.nodes).toHaveLength(1);
  });

  it('a split that is not continued leaves the road as it was, with the node inserted', () => {
    const ed = base();
    click(ed, 40, -20);
    ed.key('Escape');
    expect(ed.roads).toHaveLength(1);
    expect(ed.drawing).toBe(false);
  });
});

describe('merging (^23)', () => {
  it('a click on a node of another road ends the road being drawn there', () => {
    const ed = base();
    click(ed, 20, 80);
    click(ed, 40, 40);
    click(ed, 40, -20);
    expect(ed.drawing).toBe(false);
    expect(ed.roads[1]!.nodes).toHaveLength(3);
    expect(ed.roads[1]!.nodes[2]).toMatchObject({ x: 40, y: -20 });
    expect(junctions(ed.roads)).toEqual([{ at: { road: 0, node: 1 }, incoming: 2, outgoing: 1 }]);
  });

  it('a click on a curve of another road inserts a node and merges into it', () => {
    const ed = base();
    click(ed, 20, 80);
    click(ed, 40, 40);
    const on = bareCurvePoint(ed);
    click(ed, on.x, on.y);
    expect(ed.roads[0]!.nodes).toHaveLength(4);
    expect(ed.roads[1]!.nodes).toHaveLength(3);
    expect(ed.drawing).toBe(false);
  });
});

describe('shared nodes (^23)', () => {
  it('select, move and delete together', () => {
    const ed = base();
    click(ed, 40, -20);
    click(ed, 80, -60);
    ed.key('Escape');
    click(ed, 40, -20);
    expect(ed.selection).toEqual(closeOver(ed.roads, [{ road: 0, node: 1 }]));
    expect(ed.selection).toHaveLength(2);
    ed.pointerDown(at(40, -20));
    ed.pointerMove(at(50, -30));
    ed.pointerUp();
    expect(ed.roads[0]!.nodes[1]).toMatchObject({ x: 50, y: -30 });
    expect(ed.roads[1]!.nodes[0]).toMatchObject({ x: 50, y: -30 });
    ed.key('Delete');
    expect(ed.roads).toHaveLength(1);
    expect(ed.roads[0]!.nodes).toHaveLength(2);
  });

  it('a heading drag changes the heading of both', () => {
    const ed = base();
    click(ed, 40, -20);
    click(ed, 80, -60);
    ed.key('Escape');
    const tip = ed.handles(4).find((h) => h.type === 'head' && h.road === 0 && h.i === 1)!;
    ed.pointerDown(at(tip.x, tip.y));
    ed.pointerMove(at(40, 20));
    ed.pointerUp();
    expect(ed.roads[0]!.nodes[1]!.th).toBeCloseTo(ed.roads[1]!.nodes[0]!.th);
    expect(ed.roads[0]!.nodes[1]!.th).toBeCloseTo(Math.PI / 2);
  });
});

describe('lanes side by side (^22)', () => {
  it('a node placed one lane width beside a road snaps to it and runs parallel', () => {
    const ed = draw([
      [0, 0],
      [60, 0],
    ]);
    ed.key('Escape');
    click(ed, 500, 500);
    click(ed, 10, 3.5);
    click(ed, 50, 2.6);
    const [a, b] = ed.roads[1]!.nodes;
    expect(a).toMatchObject({ x: 10, y: 3 });
    expect(b!.y).toBeCloseTo(3, 1);
    expect(a!.th).toBeCloseTo(0);
    expect(b!.th).toBeCloseTo(0);
  });

  it('the preview shows the snapped node', () => {
    const ed = draw([
      [0, 0],
      [60, 0],
    ]);
    ed.key('Escape');
    click(ed, 500, 500);
    ed.pointerMove(at(30, 3.4));
    expect(ed.hover).toMatchObject({ kind: 'preview', node: { x: 30, y: 3, th: 0 } });
  });
});

describe('undo of splits and merges (^23, ^81)', () => {
  const undo = { ctrl: true, shift: false };

  it('a split and a merge are one step each', () => {
    const ed = base();
    click(ed, 40, -20);
    expect(ed.roads).toHaveLength(2);
    ed.key('z', undo);
    expect(ed.roads).toHaveLength(1);
    click(ed, 20, 80);
    click(ed, 40, 40);
    const steps = ed.history.past.length;
    click(ed, 40, -20);
    expect(ed.history.past).toHaveLength(steps + 1);
    ed.key('z', undo);
    expect(ed.roads[1]!.nodes).toHaveLength(2);
    expect(ed.active).toBe(1);
  });

  it('a lone road that starts at a node can be merged into another node', () => {
    const ed = base();
    click(ed, 40, 100);
    click(ed, 80, 0);
    expect(ed.roads[1]!.nodes).toHaveLength(2);
    expect(ed.drawing).toBe(false);
  });
});

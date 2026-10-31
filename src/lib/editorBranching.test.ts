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

describe('preview of a merge (^123, ^125)', () => {
  it('shows the curve to the node or point under the pointer while a road is being drawn', () => {
    const ed = base();
    click(ed, 20, 80);
    click(ed, 40, 40);
    ed.pointerMove(at(40, -20));
    expect(ed.mergePreview).toMatchObject({
      kind: 'preview',
      ref: { x: 40, y: 40 },
      node: { x: 40, y: -20 },
    });
    const on = bareCurvePoint(ed);
    ed.pointerMove(at(on.x, on.y));
    expect(ed.mergePreview?.node).toMatchObject({
      x: expect.closeTo(on.x, 0),
      y: expect.closeTo(on.y, 0),
    });
    ed.pointerMove(at(300, 300));
    expect(ed.mergePreview).toBeNull();
  });

  it('has none when nothing is being drawn (a split has no curve yet) or over the road itself', () => {
    const ed = base();
    ed.pointerMove(at(40, -20));
    expect(ed.mergePreview).toBeNull();
    click(ed, 20, 80);
    click(ed, 40, 40);
    ed.pointerMove(at(20, 80));
    expect(ed.mergePreview).toBeNull();
  });
});

describe('a drag on a curve only inserts a node (^133)', () => {
  it('a drag with a heading neither splits nor merges, a click does', () => {
    const ed = base();
    const on = bareCurvePoint(ed);
    ed.pointerDown(at(on.x, on.y));
    ed.pointerMove(at(on.x + 5, on.y + 20));
    ed.pointerUp();
    expect(ed.roads).toHaveLength(1);
    expect(ed.roads[0]!.nodes).toHaveLength(4);
    expect(ed.active).toBeNull();
    click(ed, 20, 80);
    click(ed, 40, 40);
    const p = bareCurvePoint(ed);
    ed.pointerDown(at(p.x, p.y));
    ed.pointerMove(at(p.x + 5, p.y + 20));
    ed.pointerUp();
    expect(ed.roads[1]!.nodes).toHaveLength(2);
    expect(ed.drawing).toBe(true);
  });
});

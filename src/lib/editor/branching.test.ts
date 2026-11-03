import { describe, expect, it } from 'vitest';
import { edgesIn, edgesOut } from '../model/graph';
import { at, bareCurvePoint, click, draw, roadThenDrawMode } from '../testing/editorHelpers';

/** Road A (0,0) - B (40,-20) - C (80,0), finished; draw mode, nothing being drawn. */
const base = () => roadThenDrawMode();

const middle = (ed: ReturnType<typeof base>) => ed.graph.nodes[1]!.id;

describe('splitting (^23)', () => {
  it('a click on a node starts a new road at it; the next click draws its first edge', () => {
    const ed = base();
    const b = middle(ed);
    click(ed, 40, -20);
    expect(ed.active).toBe(b);
    expect(ed.origin).toBe(b);
    expect(ed.graph.edges).toHaveLength(2);
    click(ed, 80, -60);
    expect(ed.graph.nodes).toHaveLength(4);
    expect(ed.graph.edges).toHaveLength(3);
    expect(edgesIn(ed.graph, b)).toHaveLength(1);
    expect(edgesOut(ed.graph, b)).toHaveLength(2);
  });

  it('a click on a curve inserts a node there and starts a new road from it', () => {
    const ed = base();
    const mid = bareCurvePoint(ed);
    click(ed, mid.x, mid.y);
    expect(ed.graph.nodes).toHaveLength(4);
    expect(ed.graph.edges).toHaveLength(3);
    expect(ed.active).toBe(ed.graph.nodes[3]!.id);
  });

  it('a split that is not continued leaves the road as it was', () => {
    const ed = base();
    click(ed, 40, -20);
    ed.key('Escape');
    expect(ed.graph.nodes).toHaveLength(3);
    expect(ed.graph.edges).toHaveLength(2);
    expect(ed.phase).toBe('select');
  });
});

describe('merging (^23)', () => {
  it('a click on a node of another road ends the road being drawn there', () => {
    const ed = base();
    const b = middle(ed);
    click(ed, 20, 80);
    click(ed, 40, 40);
    click(ed, 40, -20);
    expect(ed.phase).toBe('draw');
    expect(ed.graph.edges).toHaveLength(4);
    expect(edgesIn(ed.graph, b)).toHaveLength(2);
    expect(edgesOut(ed.graph, b)).toHaveLength(1);
  });

  it('a click on a curve of another road inserts a node and merges into it', () => {
    const ed = base();
    click(ed, 20, 80);
    click(ed, 40, 40);
    const on = bareCurvePoint(ed);
    click(ed, on.x, on.y);
    expect(ed.graph.nodes).toHaveLength(6);
    expect(ed.graph.edges).toHaveLength(5);
    expect(ed.phase).toBe('draw');
  });
});

describe('shared nodes (^23, ^106)', () => {
  const branched = () => {
    const ed = base();
    click(ed, 40, -20);
    click(ed, 80, -60);
    ed.key('Escape');
    return ed;
  };

  it('select, move and delete the node', () => {
    const ed = branched();
    const b = middle(ed);
    click(ed, 40, -20);
    expect(ed.selection).toEqual([b]);
    ed.pointerDown(at(40, -20));
    ed.pointerMove(at(50, -30));
    ed.pointerUp();
    expect(ed.graph.nodes[1]).toMatchObject({ x: 50, y: -30 });
    ed.key('Delete');
    expect(ed.graph.nodes).toHaveLength(0);
  });

  it('a heading drag changes the one heading of the node', () => {
    const ed = branched();
    const tip = ed.handles(4).find((h) => h.type === 'head' && h.id === middle(ed))!;
    ed.pointerDown(at(tip.x, tip.y));
    ed.pointerMove(at(40, 20));
    ed.pointerUp();
    expect(ed.graph.nodes[1]!.th).toBeCloseTo(Math.PI / 2);
  });
});

describe('undo of splits and merges (^23, ^81)', () => {
  const undo = { ctrl: true, shift: false };

  it('a split and a merge are one step each', () => {
    const ed = base();
    click(ed, 40, -20);
    expect(ed.active).not.toBeNull();
    ed.key('z', undo);
    expect(ed.active).toBeNull();
    click(ed, 20, 80);
    click(ed, 40, 40);
    const steps = ed.timeline.history.past.length;
    click(ed, 40, -20);
    expect(ed.timeline.history.past).toHaveLength(steps + 1);
    ed.key('z', undo);
    expect(ed.graph.edges).toHaveLength(3);
    expect(ed.active).not.toBeNull();
  });

  it('a lone road that starts at a node can be merged into another node', () => {
    const ed = base();
    click(ed, 40, 100);
    click(ed, 80, 0);
    expect(ed.graph.edges).toHaveLength(3);
    expect(ed.phase).toBe('draw');
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

  it('has none when nothing is being drawn (a split has no curve yet) or over the node being drawn from', () => {
    const ed = base();
    ed.pointerMove(at(40, -20));
    expect(ed.mergePreview).toBeNull();
    click(ed, 20, 80);
    click(ed, 40, 40);
    ed.pointerMove(at(40, 40));
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
    expect(ed.graph.nodes).toHaveLength(4);
    expect(ed.active).toBeNull();
    click(ed, 20, 80);
    click(ed, 40, 40);
    const p = bareCurvePoint(ed);
    ed.pointerDown(at(p.x, p.y));
    ed.pointerMove(at(p.x + 5, p.y + 20));
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(7);
    expect(ed.drawing).toBe(true);
  });
});

describe('merging into the road being drawn (^191)', () => {
  it('a click on a curve of the road itself says merge and merges, like on any other road', () => {
    const ed = draw([
      [0, 0],
      [40, -20],
      [80, 0],
    ]);
    const on = bareCurvePoint(ed);
    ed.pointerMove(at(on.x, on.y));
    expect(ed.hintTarget).toMatchObject({ kind: 'curve', act: 'merge' });
    expect(ed.mergePreview).not.toBeNull();
    click(ed, on.x, on.y);
    expect(ed.phase).toBe('draw');
    expect(ed.graph.nodes).toHaveLength(4);
    expect(ed.graph.edges).toHaveLength(4);
    const inserted = ed.graph.nodes[3]!.id;
    expect(ed.graph.edges.at(-1)).toMatchObject({ start: 2, end: inserted });
  });

  it('a drag on the curve of the road itself still only inserts a node', () => {
    const ed = draw([
      [0, 0],
      [40, -20],
      [80, 0],
    ]);
    const on = bareCurvePoint(ed);
    ed.pointerDown(at(on.x, on.y));
    ed.pointerMove(at(on.x + 5, on.y + 20));
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(4);
    expect(ed.graph.edges).toHaveLength(3);
    expect(ed.drawing).toBe(true);
  });
});

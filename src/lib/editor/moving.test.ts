import { describe, expect, it } from 'vitest';
import { graphOfRows } from '../edit/graphPiece';
import { buildEdge } from '../curves/edge';
import { edgeOfId, nodeOf } from '../model/graph';
import { edge, node } from '../testing/loadedMap';
import { B } from '../testing/moveFixture';
import { edgeHandles } from './handles';
import { dragged, droppedNode, gripNodes, mergeNodes } from './moving';

/** A at (0, 0) east, B at (100, 100) south (segment 10 is a bend with its bend point at (100, 0)), C at (-100, 0): segment 11 C to A. */
const g = graphOfRows([node(1, 0, 0), B, node(3, -100, 0)], [edge(10, 1, 2), edge(11, 3, 1)], {
  node: 4,
  edge: 12,
});
const how = { angle: null, group: [] };

describe('dragging (^71, ^468, ^534, ^535, `main`)', () => {
  it('a node goes to the pointer and keeps its heading; its group goes by as much', () => {
    const r = dragged(g, { type: 'node', node: 3 }, { x: -90, y: 20 }, { angle: null, group: [1] });
    expect(nodeOf(r, 3)).toMatchObject({ x: -90, y: 20, th: 0 });
    expect(nodeOf(r, 1)).toMatchObject({ x: 10, y: 20, th: 0 });
    expect(nodeOf(r, 2)).toEqual(nodeOf(g, 2));
    expect(gripNodes({ type: 'node', node: 3 }, [1, 3])).toEqual([3, 1]);
  });

  it('a heading point turns its node towards the pointer, and nothing else', () => {
    const r = dragged(g, { type: 'head', node: 3, x: -60, y: 0 }, { x: -50, y: 50 }, how);
    expect(nodeOf(r, 3)!.th).toBeCloseTo(Math.PI / 4);
    expect(nodeOf(r, 3)).toMatchObject({ x: -100, y: 0 });
  });

  it('a bend point turns both headings so that their lines meet at the pointer', () => {
    const ctrl = edgeHandles(edge(10, 1, 2), node(1, 0, 0), B, 1).find((h) => h.type === 'ctrl')!;
    const r = dragged(g, ctrl, { x: 120, y: -20 }, how);
    const [a, b] = [nodeOf(r, 1)!, nodeOf(r, 2)!];
    expect(a.th).toBeCloseTo(Math.atan2(-20, 120));
    expect(b.th).toBeCloseTo(Math.atan2(120, -20));
    expect(buildEdge(a, b, null).kind).toBe('C');
  });

  it('a radius point sets the radius that puts it nearest the pointer', () => {
    const rad = edgeHandles(edge(10, 1, 2), node(1, 0, 0), B, 1).find(
      (h) => h.type === 'rad' && h.t === 0.5,
    )!;
    const r = dragged(g, rad, { x: rad.x + 10, y: rad.y - 10 }, how);
    const R = edgeOfId(r, 10)!.radius!;
    expect(R).toBeGreaterThan(0);
    expect(R).toBeLessThan(100);
  });
});

describe('merging where a node is let go (^248, ^268, `main`)', () => {
  it('into a node: its segments run to that node, which keeps its place; a segment between the two goes', () => {
    const r = mergeNodes(g, 3, 1);
    expect(nodeOf(r, 3)).toBeUndefined();
    expect(edgeOfId(r, 11)).toBeUndefined();
    expect(edgeOfId(r, 10)).toMatchObject({ start: 1, end: 2 });
  });

  it('into a curve: a node is inserted with the heading of the curve there, and the dropped node merges into it', () => {
    const moved = dragged(g, { type: 'node', node: 3 }, { x: 70.71, y: 29.29 }, how);
    const at = { x: 70.71, y: 29.29, tx: Math.SQRT1_2, ty: Math.SQRT1_2 };
    const r = droppedNode(moved, 3, { edge: 10, nodes: [1, 2], at }, null);
    expect(r.id).toBe(4);
    expect(nodeOf(r.graph, 4)).toMatchObject({ x: 70.71, y: 29.29, th: Math.PI / 4 });
    expect(nodeOf(r.graph, 3)).toBeUndefined();
    expect(r.graph.edges.map((e) => [e.id, e.start, e.end]).sort()).toEqual([
      [10, 1, 4],
      [11, 4, 1],
      [12, 4, 2],
    ]);
  });
});

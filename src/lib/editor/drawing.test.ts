import { describe, expect, it } from 'vitest';
import { buildEdge } from '../curves/edge';
import { isDegenerate } from '../curves/piece';
import { graphOfRows } from '../edit/graphPiece';
import { edgeOfId, nodeOf, type Graph } from '../model/graph';
import { edge, node } from '../testing/loadedMap';
import {
  cancelled,
  curveAction,
  extendFrom,
  leafWay,
  mergeInto,
  nodeAction,
  NOT_DRAWING,
  placeNode,
  type DrawState,
} from './drawing';

/** A road 1 to 2 to 3 along x, and a lone node 4. */
const g = graphOfRows(
  [node(1, -10, 0), node(2, 0, 0), node(3, 10, 0), node(4, 0, 10)],
  [edge(10, 1, 2), edge(11, 2, 3)],
  { node: 5, edge: 12 },
);
const degree = (id: number) => g.edges.filter((e) => e.start === id || e.end === id).length;
const drawing = (active: number, end: DrawState['end'] = 'end', origin = active): DrawState => ({
  active,
  end,
  origin,
});

/** The curve of a segment of a graph: one arc when the heading of the new node was made for it (^65). */
const piecesOf = (graph: Graph, id: number) => {
  const e = edgeOfId(graph, id)!;
  const pieces = buildEdge(nodeOf(graph, e.start)!, nodeOf(graph, e.end)!, e.radius).pieces;
  return pieces.filter((p) => !isDegenerate(p));
};

describe('what a click does in draw mode (^23, ^65, ^162, ^494, `main`)', () => {
  it('with no road drawn: extend a node with one segment or none, split off any other', () => {
    expect(nodeAction(NOT_DRAWING, 3, degree)).toBe('extend');
    expect(nodeAction(NOT_DRAWING, 4, degree)).toBe('extend');
    expect(nodeAction(NOT_DRAWING, 2, degree)).toBe('split');
    expect(curveAction(NOT_DRAWING)).toBe('split');
  });

  it('while a road is drawn: finish on its node (cancel with no segment), close at its start, merge elsewhere', () => {
    expect(nodeAction(drawing(3, 'end', 1), 3, degree)).toBe('finish');
    expect(nodeAction(drawing(4), 4, degree)).toBe('cancel');
    expect(nodeAction(drawing(3, 'end', 1), 1, degree)).toBe('close');
    expect(nodeAction(drawing(3, 'end', 1), 4, degree)).toBe('merge');
    expect(curveAction(drawing(3))).toBe('merge');
  });

  it('a leaf extends the way its branch grows; Alt the other way (^916, ^915, ^917)', () => {
    expect(leafWay(0)).toBe('forwards');
    expect(leafWay(1)).toBe('backwards');
    expect(extendFrom(3, 0, false, 1)).toEqual({ active: 3, end: 'end', origin: 1 });
    expect(extendFrom(1, 1, false, 3)).toEqual({ active: 1, end: 'start', origin: 3 });
    expect(extendFrom(3, 0, true, 1).end).toBe('start');
    expect(extendFrom(1, 1, true, 3).end).toBe('end');
  });
});

describe('placing nodes (^40, ^65)', () => {
  it('the first node of a road heads east unless it was turned, and the road is drawn from it', () => {
    const r = placeNode(g, NOT_DRAWING, { pt: { x: 5, y: 5 }, th: null });
    expect(nodeOf(r.graph, 5)).toEqual({ id: 5, x: 5, y: 5, th: 0 });
    expect(r.draw).toEqual({ active: 5, end: 'end', origin: 5 });
  });

  it('forwards the next node gets the heading that makes the segment from the tip one arc', () => {
    const r = placeNode(g, drawing(3, 'end', 1), { pt: { x: 20, y: 6 }, th: null });
    expect(edgeOfId(r.graph, 12)).toMatchObject({ start: 3, end: 5, radius: null });
    expect(piecesOf(r.graph, 12)).toHaveLength(1);
    expect(r.draw.active).toBe(5);
  });

  it('backwards the new node is the start of the segment into the tip, again one arc', () => {
    const r = placeNode(g, drawing(1, 'start', 3), { pt: { x: -20, y: 6 }, th: null });
    expect(edgeOfId(r.graph, 12)).toMatchObject({ start: 5, end: 1 });
    expect(piecesOf(r.graph, 12)).toHaveLength(1);
  });

  it('a merge links the road the way it is drawn; a first node alone is cancelled, a road is not', () => {
    expect(edgeOfId(mergeInto(g, drawing(3), 4), 12)).toMatchObject({ start: 3, end: 4 });
    expect(edgeOfId(mergeInto(g, drawing(1, 'start'), 4), 12)).toMatchObject({ start: 4, end: 1 });
    expect(mergeInto(g, NOT_DRAWING, 4)).toBe(g);
    expect(nodeOf(cancelled(g, drawing(4)), 4)).toBeUndefined();
    expect(cancelled(g, drawing(3))).toBe(g);
  });
});

import { describe, expect, it } from 'vitest';
import { addEdge, addNode, emptyGraph, type Graph } from '../model/graph';
import { chainsOf } from './chains';
import { barsOf, towersOf } from './towers';

/** Nodes and the edges between them, by index. */
function build(nodes: [number, number, number][], edges: [number, number, number | null][]): Graph {
  let g = emptyGraph();
  const ids = nodes.map(([x, y, th]) => {
    const r = addNode(g, { x, y, th });
    g = r.graph;
    return r.id;
  });
  for (const [a, b, radius] of edges) g = addEdge(g, ids[a]!, ids[b]!, radius);
  return g;
}

const bars = (g: Graph) => barsOf(g, chainsOf(g));
const span = (b: { from: { x: number; y: number }; to: { x: number; y: number } }) =>
  Math.hypot(b.to.x - b.from.x, b.to.y - b.from.y);

describe('towers (^352)', () => {
  it('nodes that touch one after the other are one tower, in order across the lanes', () => {
    const g = build(
      [
        [0, 6, 0],
        [0, 0, 0],
        [0, 3, 0],
        [10, 30, 0],
      ],
      [],
    );
    const towers = towersOf(g);
    expect(towers).toHaveLength(1);
    expect(towers[0]!.map((n) => n.y)).toEqual([0, 3, 6]);
  });
});

const H = Math.PI / 2;

/** Two concentric bends, 20 m and 17 m. */
const twoBends = (inner = 17) =>
  build(
    [
      [0, 0, 0],
      [50, 30, H],
      [0, 3, 0],
      [47, 30, H],
    ],
    [
      [0, 1, 20],
      [2, 3, inner],
    ],
  );

/** Three concentric bends: 23, 20 and 17 m. */
const threeBends = () =>
  build(
    [
      [0, -3, 0],
      [50, 30, H],
      [0, 0, 0],
      [47, 30, H],
      [0, 3, 0],
      [44, 30, H],
    ],
    [
      [0, 1, 23],
      [2, 3, 20],
      [4, 5, 17],
    ],
  );

/** Two touching nodes at x = 0: parallel straight segments to their left, a straight one and a bend to their right. */
const oneSideOnly = () =>
  build(
    [
      [-40, 0, 0],
      [0, 0, 0],
      [-40, 3, 0],
      [0, 3, 0],
      [40, 0, 0],
      [40, 23, H],
    ],
    [
      [0, 1, null],
      [2, 3, null],
      [1, 4, null],
      [3, 5, 15],
    ],
  );

describe('the bars of runs of parallel segments (^350)', () => {
  it('two concentric bends: a bar at each end, across both lanes', () => {
    const found = bars(twoBends());
    expect(found).toHaveLength(2);
    found.forEach((b) => expect(span(b)).toBeCloseTo(3));
  });

  it('three lanes: one bar spans all three nodes', () => {
    expect(bars(threeBends()).map(span)).toEqual([6, 6].map((n) => expect.closeTo(n, 3)));
  });

  it('per segment, not per node: touching nodes with parallel segments on one side only get one bar', () => {
    const here = bars(oneSideOnly()).filter((b) => b.from.x === 0);
    expect(here).toHaveLength(1);
    expect(here[0]!.side.x).toBe(-1); // on the side the parallel segments run
  });

  it('no bar for touching nodes whose segments are not concentric (^334)', () => {
    expect(bars(twoBends(10))).toHaveLength(0);
  });
});

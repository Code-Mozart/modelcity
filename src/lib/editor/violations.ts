import { LANE_WIDTH_M } from '../curves/lane';
import { SAME_PLACE_M, alongOrAgainst } from '../curves/tolerance';
import { dist } from '../curves/vec';
import type { Graph } from '../model/graph';
import { nearestOnPieces } from '../snap/geometry';
import { Grid } from '../curves/grid';
import { curveGridOf, curvesOf, near } from './derived';

/**
 * Something the model allows but the map should not have (^827): the first rules of the validator
 * (^169, ^254). Tracked, not prevented (^843).
 */
export interface Violation {
  /** `nodes`: two nodes touch and head another way than the same or the opposite (^817). `segment`: a node touches a segment and heads another way than it (^818). */
  kind: 'nodes' | 'segment';
  node: number;
  /** The other node, or the segment. */
  other: number;
}

/** The size of a cell of the grid of the nodes (meters), and how far a touch reaches. */
const CELL_M = 20;
const REACH_M = LANE_WIDTH_M + SAME_PLACE_M;

/** Touching nodes that do not head the same or the opposite way (^254, ^817): each node is only compared with those near it (^938). */
function touchingNodes(g: Graph): Violation[] {
  const grid = new Grid<number>(CELL_M);
  g.nodes.forEach((n, i) => grid.add(i, { x0: n.x, x1: n.x, y0: n.y, y1: n.y }));
  return g.nodes.flatMap((a, i) =>
    [...grid.near({ x0: a.x - REACH_M, x1: a.x + REACH_M, y0: a.y - REACH_M, y1: a.y + REACH_M })]
      .filter((j) => j > i)
      .sort((x, y) => x - y)
      .flatMap((j) => {
        const b = g.nodes[j]!;
        return Math.abs(dist(a, b) - LANE_WIDTH_M) < SAME_PLACE_M && !alongOrAgainst(a, b)
          ? [{ kind: 'nodes' as const, node: a.id, other: b.id }]
          : [];
      }),
  );
}

/** A node on the offset curve of a segment that does not run the same way or the opposite way there (^818). */
function touchingSegments(g: Graph): Violation[] {
  const [curves, grid] = [curvesOf(g), curveGridOf(g)];
  return g.nodes.flatMap((n) =>
    [...grid.near({ x0: n.x - REACH_M, x1: n.x + REACH_M, y0: n.y - REACH_M, y1: n.y + REACH_M })]
      .sort((x, y) => x - y)
      .flatMap((i) => {
        const { edge, pieces, box } = curves[i]!;
        if (edge.start === n.id || edge.end === n.id || !near(box, n, REACH_M)) return [];
        const at = nearestOnPieces(pieces, n);
        const touches = at && Math.abs(at.d - LANE_WIDTH_M) < SAME_PLACE_M;
        const heads = at && alongOrAgainst(n, { th: Math.atan2(at.ty, at.tx) });
        return touches && !heads ? [{ kind: 'segment' as const, node: n.id, other: edge.id }] : [];
      }),
  );
}

/** All the violations of the graph (^827). */
export const violationsOf = (g: Graph): Violation[] => [
  ...touchingNodes(g),
  ...touchingSegments(g),
];

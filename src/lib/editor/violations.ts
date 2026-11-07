import { LANE_WIDTH_M } from '../curves/lane';
import { SAME_PLACE_M, SAME_WAY } from '../curves/tolerance';
import { dist, dot, fromAngle } from '../curves/vec';
import type { Graph } from '../model/graph';
import { nearestOnPieces } from '../snap/geometry';
import { curvesOf, near } from './derived';

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

const alongOrAgainst = (a: { th: number }, b: { th: number }) =>
  Math.abs(dot(fromAngle(a.th), fromAngle(b.th))) > 1 - SAME_WAY;

/** Touching nodes that do not head the same or the opposite way (^254, ^817). */
function touchingNodes(g: Graph): Violation[] {
  return g.nodes.flatMap((a, i) =>
    g.nodes
      .slice(i + 1)
      .flatMap((b) =>
        Math.abs(dist(a, b) - LANE_WIDTH_M) < SAME_PLACE_M && !alongOrAgainst(a, b)
          ? [{ kind: 'nodes' as const, node: a.id, other: b.id }]
          : [],
      ),
  );
}

/** A node on the offset curve of a segment that does not run the same way or the opposite way there (^818). */
function touchingSegments(g: Graph): Violation[] {
  const curves = curvesOf(g);
  return g.nodes.flatMap((n) =>
    curves.flatMap(({ edge, pieces, box }) => {
      if (edge.start === n.id || edge.end === n.id || !near(box, n, LANE_WIDTH_M + SAME_PLACE_M))
        return [];
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

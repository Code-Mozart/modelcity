import type { Anchor } from './bounds';
import type { EdgeRef } from './curves/path';
import { isDegenerate } from './curves/piece';
import type { Roads } from './curves/roads';

/** Half the drawn size of a node dot (5.5 plus its outline) and of a curve (4 px wide), pixels. */
const NODE_RADIUS_PX = 7;
const CURVE_HALF_PX = 2.5;

/**
 * The skeleton of all roads as camera-bounds anchors (^62): the node dots and the pieces of the
 * curves. Control points are not included, they are only shown by need (^60).
 */
export function skeletonAnchors(roads: Roads, edges: EdgeRef[][]): Anchor[] {
  return roads.flatMap((path, road) => {
    const nodes = path.nodes.map((n): Anchor => ({
      kind: 'point',
      x: n.x,
      y: n.y,
      r: NODE_RADIUS_PX,
    }));
    const pieces = (edges[road] ?? [])
      .flatMap((ref) => ref.E.pieces)
      .filter((piece) => !isDegenerate(piece))
      .map((piece): Anchor => ({ kind: 'piece', piece, r: CURVE_HALF_PX }));
    return [...nodes, ...pieces];
  });
}

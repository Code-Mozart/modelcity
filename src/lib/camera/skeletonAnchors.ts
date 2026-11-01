import type { Anchor } from './bounds';
import { isDegenerate } from '../curves/piece';
import type { Chain } from '../model/chains';

/** Half the drawn size of a node dot (5.5 plus its outline) and of a curve (4 px wide), pixels. */
const NODE_RADIUS_PX = 7;
const CURVE_HALF_PX = 2.5;

/**
 * The skeleton of all roads as camera-bounds anchors (^62): the node dots and the pieces of the
 * curves. Control points are not included, they are only shown by need (^60).
 */
export function skeletonAnchors(chains: Chain[]): Anchor[] {
  return chains.flatMap((chain) => {
    const nodes = chain.path.nodes.map((n): Anchor => ({
      kind: 'point',
      x: n.x,
      y: n.y,
      r: NODE_RADIUS_PX,
    }));
    const pieces = chain.edges
      .flatMap((ref) => ref.E.pieces)
      .filter((piece) => !isDegenerate(piece))
      .map((piece): Anchor => ({ kind: 'piece', piece, r: CURVE_HALF_PX }));
    return [...nodes, ...pieces];
  });
}

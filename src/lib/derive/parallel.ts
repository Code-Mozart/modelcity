/** Parallel segments (^100, ^334, ^853), ported from `main`'s `editor/parallel.ts`. */
import { pointOn, sweeps } from '../curves/piece';
import type { Piece } from '../curves/types';
import { LANE_WIDTH_M } from '../curves/lane';
import { SAME_PLACE_M, alongOrAgainst as headsAlongOrAgainst } from '../curves/tolerance';
import { dist } from '../curves/vec';
import { nodeOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { curveOfEdge } from './curves';

/** Whether two headings are the same or exactly opposite (^100). */
const alongOrAgainst = headsAlongOrAgainst;

/** Whether the ends of two segments are one lane width apart, pair by pair, in this order. */
const apart = (a: [GNode, GNode], b: [GNode, GNode]) =>
  a.every(
    (n, i) => alongOrAgainst(n, b[i]!) && Math.abs(dist(n, b[i]!) - LANE_WIDTH_M) < SAME_PLACE_M,
  );

/** Whether the nodes of two segments touch at both ends, in either order (^100, ^334 A and B). */
export function touching(g: Graph, a: GEdge, b: GEdge): boolean {
  const [as, ae, bs, be] = [a.start, a.end, b.start, b.end].map((id) => nodeOf(g, id));
  if (!as || !ae || !bs || !be) return false;
  return apart([as, ae], [bs, be]) || apart([as, ae], [be, bs]);
}

type Sweep = Extract<Piece, { type: 'arc' }>;

/**
 * Whether the arc `y` runs one lane width from the arc `x` along all of `x`, to within `SAME_PLACE_M`,
 * and turns the same way (`sense` 1) or the other (-1). Measured as a distance between the curves
 * at points of `x`, a position, not as the distance of two centers (far away, they magnify the
 * millimeter of the nodes by the radius over the distance) or the difference of two radii (the
 * same, by 1 / (1 - cos of the angle)); ^853.
 */
function nestedArcs(x: Sweep, y: Sweep, sense: number): boolean {
  const gap = (t: number) => {
    const m = pointOn(x, t);
    return Math.abs(Math.abs(dist(m, y.c) - y.r) - LANE_WIDTH_M);
  };
  return (
    Math.sign(x.da) === sense * Math.sign(y.da) &&
    [0, 0.25, 0.5, 0.75, 1].every((t) => gap(t) < SAME_PLACE_M)
  );
}

/**
 * Whether the arcs of two curves are concentric, as many and each one (a straight one has none,
 * ^334 C). Decided from how far apart the curves run (^853), not from the centers (^852). The curve may run the other way round.
 */
function concentric(a: Piece[], b: Piece[]): boolean {
  const [ca, cb] = [a.filter(sweeps), b.filter(sweeps)];
  if (ca.length !== cb.length) return false;
  const along = ca.every((x, i) => nestedArcs(x, cb[i]!, 1));
  const against = ca.every((x, i) => nestedArcs(x, cb[cb.length - 1 - i]!, -1));
  return along || against;
}

/** Whether two segments are parallel (^100, ^334): their nodes touch at both ends and their curves are concentric. */
export function parallel(g: Graph, a: GEdge, b: GEdge): boolean {
  const [ea, eb] = [curveOfEdge(g, a.id), curveOfEdge(g, b.id)];
  return touching(g, a, b) && !!ea && !!eb && concentric(ea.pieces, eb.pieces);
}

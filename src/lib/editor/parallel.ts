import { pointOn, sweeps } from '../curves/piece';
import type { Piece } from '../curves/types';
import { LANE_WIDTH_M } from '../curves/lane';
import { SAME_PLACE_M, SAME_WAY, TWO_NODES_M } from '../curves/tolerance';
import { dist, dot, fromAngle, type Vec } from '../curves/vec';
import { edgeOfId, nodeOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { curveOfEdge, type Chain } from './chains';
import type { Focus } from './focus';

/** Whether two headings are the same or exactly opposite (^100). */
const alongOrAgainst = (a: GNode, b: GNode) =>
  Math.abs(Math.abs(dot(fromAngle(a.th), fromAngle(b.th))) - 1) < SAME_WAY;

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

/** How far (meters) from one lane width apart two curves may be, anywhere: the nodes touch within `SAME_PLACE_M` at each end of the curve. */

/**
 * Whether the arc `y` runs one lane width from the arc `x` along all of `x`, to within `TWO_NODES_M`,
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
    [0, 0.25, 0.5, 0.75, 1].every((t) => gap(t) < TWO_NODES_M)
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

/** The segments together with all that are parallel to them, and to those in turn: any number of lanes on top of each other (^302). */
export function withParallels(g: Graph, ids: number[]): number[] {
  const all = new Set(ids);
  const queue = [...ids];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    const e = edgeOfId(g, id);
    const more = g.edges.filter((o) => e && !all.has(o.id) && parallel(g, e, o));
    more.forEach((o) => all.add(o.id));
    queue.push(...more.map((o) => o.id));
  }
  return [...all];
}

/** A line from one end to the other of a tower of control points (^344). */
export interface TowerLine {
  p: Vec;
  q: Vec;
  /** The control points of the other segments, to show as rings (^361). */
  others: Vec[];
}

/** The two points that are farthest apart: the ends of a row of points on a line. */
function ends(points: Vec[]): [Vec, Vec] {
  let best: [Vec, Vec] = [points[0]!, points[0]!];
  for (const a of points) for (const b of points) if (dist(a, b) > dist(...best)) best = [a, b];
  return best;
}

/**
 * The line through the radius points of a segment and the segments that are interlocked with it
 * (parallel, ^302), at the same place of their arcs: the *tower* of the control point (^344). On a
 * bend the middle points are on the bisector, the end points (where the arc meets the straight
 * pieces) on the normal across the lanes. It runs from the outermost to the innermost point. Null if
 * no segment is parallel to it.
 */
export function controlTower(g: Graph, edge: number, k: number, t: number): TowerLine | null {
  return towerThrough(g, withParallels(g, [edge]), edge, { k, t });
}

/** The same through the radius points of some segments (those that follow, ^832). */
export function towerThrough(
  g: Graph,
  ids: number[],
  edge: number,
  { k, t }: { k: number; t: number },
): TowerLine | null {
  const own = curveOfEdge(g, edge)?.pieces[k];
  const places = ids.flatMap((id) => {
    const piece = curveOfEdge(g, id)?.pieces[k];
    if (!piece || !sweeps(piece) || !own || !sweeps(own)) return [];
    // A segment that runs the other way has the same end of the bend at the other end of its arc (^360).
    const same = Math.sign(piece.da) === Math.sign(own.da);
    const { x, y } = pointOn(piece, same ? t : 1 - t);
    return [{ id, at: { x, y } }];
  });
  if (ids.length < 2 || places.length !== ids.length) return null;
  const [p, q] = ends(places.map((c) => c.at));
  return { p, q, others: places.filter((c) => c.id !== edge).map((c) => c.at) };
}

/** The line for the control point that is hovered or dragged, if it is a radius point of a segment with parallel ones (^344). */
export function focusTower(
  g: Graph,
  chains: Chain[],
  focus: Focus | null,
  ids?: number[],
): TowerLine | null {
  const edge = focus?.type === 'rad' ? chains[focus.road]?.edgeIds[focus.i] : undefined;
  if (edge === undefined) return null;
  const place = { k: focus!.k ?? 0, t: focus!.t ?? 0.5 };
  return ids ? towerThrough(g, ids, edge, place) : controlTower(g, edge, place.k, place.t);
}

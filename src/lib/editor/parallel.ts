import { pointOn, sweeps } from '../curves/piece';
import type { Piece } from '../curves/types';
import { LANE_WIDTH_M } from '../curves/lane';
import { dist, dot, fromAngle, type Vec } from '../curves/vec';
import { edgeOfId, nodeOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';

const TOL_M = 1e-3;

/** Whether two headings are the same or exactly opposite (^100). */
const alongOrAgainst = (a: GNode, b: GNode) =>
  Math.abs(Math.abs(dot(fromAngle(a.th), fromAngle(b.th))) - 1) < 1e-9;

/** Whether the ends of two segments are one lane width apart, pair by pair, in this order. */
const apart = (a: [GNode, GNode], b: [GNode, GNode]) =>
  a.every((n, i) => alongOrAgainst(n, b[i]!) && Math.abs(dist(n, b[i]!) - LANE_WIDTH_M) < TOL_M);

/** Whether the nodes of two segments touch at both ends, in either order (^100, ^334 A and B). */
export function touching(g: Graph, a: GEdge, b: GEdge): boolean {
  const [as, ae, bs, be] = [a.start, a.end, b.start, b.end].map((id) => nodeOf(g, id));
  if (!as || !ae || !bs || !be) return false;
  return apart([as, ae], [bs, be]) || apart([as, ae], [be, bs]);
}

/** Whether the arcs of two curves share their centers, as many and each one (a straight one has none, ^334 C). */
function sameCenters(a: Piece[], b: Piece[]): boolean {
  const [ca, cb] = [a.filter(sweeps), b.filter(sweeps)];
  return ca.length === cb.length && ca.every((x) => cb.some((y) => dist(x.c, y.c) < TOL_M));
}

/** Whether two segments are parallel (^100, ^334): their nodes touch at both ends and their curves are concentric. */
export function parallel(g: Graph, a: GEdge, b: GEdge): boolean {
  const [ea, eb] = [curveOfEdge(g, a.id), curveOfEdge(g, b.id)];
  return touching(g, a, b) && !!ea && !!eb && sameCenters(ea.pieces, eb.pieces);
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
  const ids = withParallels(g, [edge]);
  const at = ids.flatMap((id) => {
    const piece = curveOfEdge(g, id)?.pieces[k];
    return piece && sweeps(piece) ? [{ x: pointOn(piece, t).x, y: pointOn(piece, t).y }] : [];
  });
  if (ids.length < 2 || at.length !== ids.length) return null;
  const [p, q] = ends(at);
  return { p, q };
}

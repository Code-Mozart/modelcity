import { sweeps } from '../curves/piece';
import { LANE_WIDTH_M } from '../curves/lane';
import { dist, dot, fromAngle, perp, sub, type Vec } from '../curves/vec';
import {
  edgeOfId,
  nodeOf,
  shareRadius,
  withRadius,
  type GEdge,
  type GNode,
  type Graph,
} from '../model/graph';
import { chainsOf } from './chains';
import { selectedSegments } from './selection';

const TOL_M = 1e-3;

/** Whether two headings are the same or exactly opposite (^100). */
const alongOrAgainst = (a: GNode, b: GNode) =>
  Math.abs(Math.abs(dot(fromAngle(a.th), fromAngle(b.th))) - 1) < 1e-9;

/** Whether the ends of two segments are one lane width apart, pair by pair, in this order. */
const apart = (a: [GNode, GNode], b: [GNode, GNode]) =>
  a.every((n, i) => alongOrAgainst(n, b[i]!) && Math.abs(dist(n, b[i]!) - LANE_WIDTH_M) < TOL_M);

/** Whether two segments are parallel (^100): same or opposite headings at both ends, one lane width apart. */
function parallel(g: Graph, a: GEdge, b: GEdge): boolean {
  const [as, ae, bs, be] = [a.start, a.end, b.start, b.end].map((id) => nodeOf(g, id));
  if (!as || !ae || !bs || !be) return false;
  return apart([as, ae], [bs, be]) || apart([as, ae], [be, bs]);
}

/** The center of the arc of a segment that is a bend (the only shape with one arc), with its heading at the start. */
function arcOf(g: Graph, edge: number): { c: Vec; u: Vec } | null {
  const chain = chainsOf(g).find((ch) => ch.edgeIds.includes(edge));
  const ref = chain?.edges[chain.edgeIds.indexOf(edge)];
  const arc = ref?.E.kind === 'C' ? ref.E.pieces.find(sweeps) : undefined;
  return arc && ref ? { c: arc.c, u: fromAngle(ref.p.th) } : null;
}

/**
 * Give the selected segments the radius of the dragged one (^77). Segments that are parallel to it
 * (^100) get the concentric radius instead (^282): their curve shares the center of the dragged
 * one, so lanes next to each other stay lanes.
 */
export function shareConcentric(g: Graph, own: number, all: number[]): Graph {
  const shared = shareRadius(g, own, all);
  const [from, arc] = [edgeOfId(shared, own), arcOf(shared, own)];
  if (!from || !arc || from.radius === null) return shared;
  const radiusOf = (b: GEdge) => Math.abs(dot(sub(arc.c, nodeOf(shared, b.start)!), perp(arc.u)));
  const edges = shared.edges.map((e) =>
    e.id !== own && all.includes(e.id) && parallel(shared, from, e)
      ? { ...e, radius: radiusOf(e) }
      : e,
  );
  return { ...shared, edges };
}

/**
 * A segment that was built between the nodes beside another segment's nodes (parallel, ^100) gets
 * the radius that makes its curve concentric with that segment (^281, ^279).
 */
export function concentricWithParallel(g: Graph, edge: number): Graph {
  const e = edgeOfId(g, edge);
  const start = e && nodeOf(g, e.start);
  if (!e || !start) return g;
  for (const s of g.edges) {
    const arc = s.id !== e.id && parallel(g, s, e) ? arcOf(g, s.id) : null;
    if (arc) return withRadius(g, e.id, Math.abs(dot(sub(arc.c, start), perp(arc.u))));
  }
  return g;
}

/**
 * The segments whose radius follows the dragged one (^77, ^302): the selected ones, and always the
 * segments parallel to it (they stay concentric, ^282), unless only its own two nodes are selected:
 * then the segment changes alone.
 */
export function sharedWith(g: Graph, selection: number[], own: number): number[] {
  const e = edgeOfId(g, own);
  if (!e) return [];
  const alone = selection.length === 2 && selection.includes(e.start) && selection.includes(e.end);
  if (alone) return [own];
  const parallels = g.edges.filter((o) => o.id !== own && parallel(g, e, o)).map((o) => o.id);
  return [...new Set([own, ...selectedSegments(g, selection), ...parallels])];
}

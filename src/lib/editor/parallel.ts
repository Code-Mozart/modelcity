import { middleOf } from '../curves/measure';
import { pointOn, sweeps } from '../curves/piece';
import type { Piece } from '../curves/types';
import { LANE_WIDTH_M } from '../curves/lane';
import { dist, dot, fromAngle, type Vec } from '../curves/vec';
import { nodeOf, type GEdge, type GNode, type Graph } from '../model/graph';
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

/** A short line through the middles of two parallel segments, on their shared bisector (^344). */
export interface ParallelLink {
  p: Vec;
  q: Vec;
}

/** The middle of a bend is the middle of its arc, on the bisector; else the middle of the curve. */
function middleOn(pieces: Piece[]) {
  const arcs = pieces.filter(sweeps);
  return arcs.length === 1 ? pointOn(arcs[0]!, 0.5) : middleOf(pieces);
}

/**
 * The links between the segments `ids` and the segments parallel to them (^100, ^334): through the
 * middle of each, which for bends is on the bisector, for straight segments the line through their
 * midpoints (^344).
 */
export function parallelLinks(g: Graph, ids: number[]): ParallelLink[] {
  return g.edges.flatMap((a) =>
    ids.includes(a.id)
      ? g.edges
          .filter((b) => b.id !== a.id && (b.id > a.id || !ids.includes(b.id)) && parallel(g, a, b))
          .flatMap((b) => {
            const [p, q] = [curveOfEdge(g, a.id), curveOfEdge(g, b.id)].map(
              (E) => E && middleOn(E.pieces),
            );
            return p && q ? [{ p: { x: p.x, y: p.y }, q: { x: q.x, y: q.y } }] : [];
          })
      : [],
  );
}

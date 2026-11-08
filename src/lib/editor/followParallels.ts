import { LANE_WIDTH_M } from '../curves/lane';
import { sweeps } from '../curves/piece';
import { SAME_PLACE_M, alongOrAgainst } from '../curves/tolerance';
import { cross, dist, dot, fromAngle, sub } from '../curves/vec';
import { edgesAt, nodeOf, withRadius, type GEdge, type GNode, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { touchPoint } from './derived';
import { parallel, touching } from './parallel';
import { concentricWithParallel } from './sharedRadius';

/** Whether the node `n` is where a node of `s` touches it: a lane width away on its normal. */
const besideNode = (g: Graph, n: GNode, s: GEdge) =>
  [s.start, s.end].some((id) => {
    const o = id === n.id ? undefined : nodeOf(g, id);
    return (
      o &&
      Math.abs(dist(n, o) - LANE_WIDTH_M) < SAME_PLACE_M &&
      alongOrAgainst(n, o) &&
      Math.abs(dot(sub(n, o), fromAngle(o.th))) < SAME_PLACE_M
    );
  });

/**
 * The radius that makes the segment `e` concentric with an arc of the segment `s`, if `e` runs
 * beside `s`: each of its nodes touches a node of `s` or lies on the offset curve of `s` (^818), and
 * the heading line of one of them is tangent to a circle round the center of an arc, a lane width
 * off it: the radius of that circle (^877).
 */
function radiusBeside(g: Graph, e: GEdge, s: GEdge): number | null {
  const pieces = curveOfEdge(g, s.id)?.pieces;
  const ends = [e.start, e.end].flatMap((id) => nodeOf(g, id) ?? []);
  if (!pieces || ends.length < 2) return null;
  const beside = (n: GNode) => besideNode(g, n, s) || touchPoint(pieces, n) !== null;
  if (!ends.every(beside)) return null;
  // A node on the offset of an arc, or of a straight piece that touches the arc, has a heading line that is tangent to a circle round the center of the arc, a lane width off it.
  for (const n of ends) {
    for (const arc of pieces.filter(sweeps)) {
      const R = Math.abs(cross(sub(arc.c, n), fromAngle(n.th)));
      if (Math.abs(Math.abs(R - arc.r) - LANE_WIDTH_M) < SAME_PLACE_M) return R;
    }
  }
  return null;
}

/** Whether the segment `e` has an arc of the radius `R` now. */
const hasRadius = (g: Graph, e: GEdge, R: number) =>
  curveOfEdge(g, e.id)?.pieces.some((p) => sweeps(p) && Math.abs(p.r - R) < SAME_PLACE_M) ?? false;

/** The segment `e` made concentric with a segment beside it, if there is one that it is not parallel to yet. */
function concentricFor(g: Graph, e: GEdge): Graph {
  const others = g.edges.filter((s) => s.id !== e.id);
  if (others.some((s) => touching(g, s, e) && parallel(g, s, e))) return g;
  const both = concentricWithParallel(g, e.id);
  const now = both.edges.find((x) => x.id === e.id);
  if (now && others.some((s) => parallel(both, s, now))) return both;
  for (const s of others) {
    const R = radiusBeside(g, e, s);
    const next = R === null ? g : withRadius(g, e.id, R);
    if (R !== null && hasRadius(next, e, R)) return next;
  }
  return g;
}

/**
 * A segment of the one node that is new or has moved, that runs beside another segment (a node
 * snapped onto an offset curve, ^279, or a segment drawn there) without running parallel to it, gets
 * the radius that makes it concentric, whatever radius it had (^877, user: yes, anywhere on the
 * offset curve). Not when several nodes move together. Where the radius does not fit nothing
 * changes, and segments of nodes that did not move never change.
 */
export function followParallels(before: Graph, after: Graph): Graph {
  const was = new Map(before.nodes.map((n) => [n.id, n]));
  const moved = after.nodes.filter((n) => {
    const b = was.get(n.id);
    return !b || Math.hypot(b.x - n.x, b.y - n.y) > 1e-9;
  });
  if (moved.length !== 1) return after;
  let g = after;
  for (const e of edgesAt(after, moved[0]!.id)) g = concentricFor(g, e);
  return g;
}

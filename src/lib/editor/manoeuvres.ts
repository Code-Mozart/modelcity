import { alongOrAgainst, sameWay, SAME_PLACE_M } from '../curves/tolerance';
import { dot, fromAngle, perp, sub } from '../curves/vec';
import { nodeOf, type GEdge, type GNode, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { touchPoint } from './derived';

/**
 * What a segment does between its start and its end, as it is travelled (^1006): judged by where
 * its end node lies and heads, seen from its start node. `straight`: on the line of the start
 * heading; a `shift`: the same heading, moved sideways; a turn: another heading; a `u-turn`: the
 * opposite heading.
 */
export type Manoeuvre =
  'straight' | 'left turn' | 'right turn' | 'shift left' | 'shift right' | 'u-turn';

/** The sum of the turning of the arcs of a segment: positive is to the right (y is down). */
export const turning = (g: Graph, e: GEdge) =>
  (curveOfEdge(g, e.id)?.pieces ?? []).reduce((n, p) => n + (p.type === 'arc' ? p.da : 0), 0);

/** How much a segment may turn in all and still go on beside a lane as a lane that is added or ends (radians, 10 degrees; ^1056, assumed): a lane that turns more is a turn, as in ^1020. */
const GENTLE_RAD = Math.PI / 18;

export function manoeuvreOf(g: Graph, e: GEdge): Manoeuvre | null {
  const [a, b] = [nodeOf(g, e.start), nodeOf(g, e.end)];
  if (!a || !b) return null;
  if (!alongOrAgainst(a, b)) return turning(g, e) > 0 ? 'right turn' : 'left turn';
  if (!sameWay(a, b)) return 'u-turn';
  const side = dot(sub(b, a), perp(fromAngle(a.th)));
  if (Math.abs(side) < SAME_PLACE_M) return 'straight';
  return side > 0 ? 'shift right' : 'shift left';
}

export const isShift = (m: Manoeuvre | null) => m === 'shift left' || m === 'shift right';

/**
 * Whether the far node of the segment `e` of the node `n` lies beside another segment of the node: one lane width away, heading along it, so that the two are a tower (^818). Then the side of that segment it is on, else null.
 */
export function besideSide(
  g: Graph,
  n: GNode,
  e: GEdge,
  siblings: GEdge[],
): 'left' | 'right' | null {
  const far = nodeOf(g, e.start === n.id ? e.end : e.start);
  for (const s of far ? siblings.filter((x) => x.id !== e.id) : []) {
    const pieces = curveOfEdge(g, s.id)?.pieces;
    const at = pieces && touchPoint(pieces, far!);
    const gentle = Math.abs(turning(g, e)) < GENTLE_RAD && Math.abs(turning(g, s)) < GENTLE_RAD;
    if (at && gentle) return dot(sub(far!, at), perp(fromAngle(at.th))) > 0 ? 'right' : 'left';
  }
  return null;
}

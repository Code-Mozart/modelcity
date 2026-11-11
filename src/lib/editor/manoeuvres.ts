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

/** Whether the far node of the segment `e` of the node `n` lies beside another segment of the node on the same side of it: one lane width away, heading along it (^818). */
export function besideSibling(g: Graph, n: GNode, e: GEdge, siblings: GEdge[]): boolean {
  const far = nodeOf(g, e.start === n.id ? e.end : e.start);
  return siblings.some((s) => {
    const pieces = s.id === e.id ? null : curveOfEdge(g, s.id)?.pieces;
    return !!far && !!pieces && touchPoint(pieces, far) !== null;
  });
}

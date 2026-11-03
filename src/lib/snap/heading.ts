import { angleOf, dot, sub, type Vec } from '../curves/vec';
import type { SnapCurve, SnapHit, Suggestion } from './types';

const flip = (th: number, on: boolean) => (on ? th + Math.PI : th);

/** The direction of a snap line pointing away from its base, the point that made it (^313). */
function awayFrom(c: SnapCurve, pt: Vec): number | null {
  const piece = c.pieces[0];
  const base = c.origins[0];
  if (piece?.type !== 'line' || !base) return null;
  const d = sub(piece.Q, piece.P);
  return dot(sub(pt, base), d) >= 0 ? angleOf(d) : angleOf(d) + Math.PI;
}

/**
 * The heading the heading control point takes from what it snapped to (^313): the heading of a snap
 * point, the direction of a snap line away from its base, the direction of a segment (the
 * opposite on its left, ^253). `Alt` inverts it (^301). Null if the suggestion has none.
 */
export function headingFrom(hit: SnapHit | null, alt: boolean): number | null {
  const s = hit?.by[0];
  if (!hit || !s) return null;
  let th: number | null;
  if (s.kind === 'point') th = s.heading;
  else if (s.rule === 'curve' || s.rule === 'offset') {
    th = hit.heading === null ? null : hit.heading + (s.side === -1 ? Math.PI : 0);
  } else th = awayFrom(s, hit.pt);
  return th === null ? null : flip(th, alt);
}

/**
 * The heading a node placed or moved onto a snap gets (^254, ^253, ^317, ^318): beside another node
 * or on an offset curve of a segment the heading of that lane (right-hand traffic), on a snap
 * line the direction of its normal. `Alt` takes the other one (^301). Null elsewhere.
 */
export function placedHeading(hit: SnapHit | null, alt: boolean): number | null {
  const s = hit?.by[0];
  const th = hit && s ? laneHeading(hit, s) : null;
  return th === null ? null : flip(th, alt);
}

/** The heading of the lane a snap is in, or the normal of a snap line, before `Alt`. */
function laneHeading(hit: SnapHit, s: Suggestion): number | null {
  if (s.kind === 'point')
    return s.rule === 'node-points' && s.node === undefined ? s.heading : null;
  if (s.rule === 'offset')
    return hit.heading === null ? null : hit.heading + (s.side === -1 ? Math.PI : 0);
  return s.straight ? (s.heading ?? null) : null;
}

import { angleOf, dot, sub, type Vec } from '../curves/vec';
import { nearestOnPieces } from './geometry';
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

/** The direction of a segment's curve at a place, the opposite one on its left lane (^253). */
function laneAt(c: SnapCurve, pt: Vec): number | null {
  const n = nearestOnPieces(c.pieces, pt);
  return n ? angleOf({ x: n.tx, y: n.ty }) + (c.side === -1 ? Math.PI : 0) : null;
}

const isSegmentCurve = (s: SnapCurve) => ['curve', 'offset', 'own'].includes(s.rule);

/** How specific a suggestion is: a point, then the curve of a segment (or a lane of it), then a line (^793, as `snapTo` ranks them). */
const rankOf = (s: Suggestion) => (s.kind === 'point' ? 0 : isSegmentCurve(s) ? 1 : 2);

/** Whether two headings are the same direction. */
const same = (a: number, b: number) => Math.abs(Math.sin((a - b) / 2)) < 1e-3;

/**
 * The heading the suggestions a snap is made of agree on (^793, ^792): of the most specific ones
 * that give a heading, all must give the same, else there is none (position only). It does not
 * depend on their order. A snap on a point is that point's alone (it is more specific than any
 * curve through it).
 */
function decide(
  hit: SnapHit,
  of: (s: Suggestion, pt: Vec) => number | null,
): { th: number; by: Suggestion[] } | null {
  const first = hit.by[0];
  const among = first?.kind === 'point' ? [first] : hit.by;
  const given = among.flatMap((s) => {
    const th = of(s, hit.pt);
    return th === null ? [] : [{ s, rank: rankOf(s), th }];
  });
  const rank = Math.min(...given.map((g) => g.rank));
  const best = given.filter((g) => g.rank === rank);
  const th = best[0]?.th;
  return th !== undefined && best.every((g) => same(g.th, th))
    ? { th, by: best.map((g) => g.s) }
    : null;
}

const agreed = (hit: SnapHit, of: (s: Suggestion, pt: Vec) => number | null) =>
  decide(hit, of)?.th ?? null;

/** Made by a node: its normal line, its heading line, its points (^265 to ^267). */
const byNode = (s: Suggestion) => ['node-normal', 'node-heading', 'node-points'].includes(s.rule);

/**
 * The nodes the heading of a snap comes from (^795): of the suggestions that gave it, those that a
 * node made (not the curve of a segment, which is shown already). `copied`: the heading control
 * point copies it (^313), else a node placed or moved onto it takes it (^254, ^793).
 */
export function headingSources(hit: SnapHit | null, copied: boolean): number[] {
  const given = hit && decide(hit, copied ? rawHeading : laneHeading);
  return [...new Set((given?.by ?? []).filter(byNode).flatMap((s) => s.from))];
}

/**
 * The heading the heading control point takes from what it snapped to (^313): the heading of a snap
 * point, the direction of a snap line away from its base, the direction of a segment (the
 * opposite on its left, ^253). `Alt` inverts it (^301). Null if the suggestions have none or differ.
 */
export function headingFrom(hit: SnapHit | null, alt: boolean): number | null {
  const th = hit ? agreed(hit, rawHeading) : null;
  return th === null ? null : flip(th, alt);
}

/** The heading of a suggestion before `Alt`: see `headingFrom`. */
function rawHeading(s: Suggestion, pt: Vec): number | null {
  if (s.kind === 'point') return s.heading;
  return isSegmentCurve(s) ? laneAt(s, pt) : awayFrom(s, pt);
}

/**
 * The heading a node placed or moved onto a snap gets (^254, ^253, ^317, ^318, ^793): beside another
 * node or on an offset curve of a segment the heading of that lane (right-hand traffic), on a snap
 * line the direction of its normal, on a tangent line the direction along it, away from its base.
 * `Alt` takes the other one (^301). Null elsewhere.
 */
export function placedHeading(hit: SnapHit | null, alt: boolean): number | null {
  const th = hit ? agreed(hit, laneHeading) : null;
  return th === null ? null : flip(th, alt);
}

/** The heading of the lane a snap is in, of a snap line, or of a point, before `Alt`. */
function laneHeading(s: Suggestion, pt: Vec): number | null {
  if (s.kind === 'point')
    return s.rule === 'node-points' && s.node === undefined ? s.heading : null;
  if (s.rule === 'own' || s.rule === 'offset') return laneAt(s, pt);
  if (s.rule === 'curve' || !s.straight) return null;
  return s.along ? awayFrom(s, pt) : (s.heading ?? null);
}

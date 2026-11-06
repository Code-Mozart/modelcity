import { angleOf, dist, dot, sub, type Vec } from '../curves/vec';
import { sameAngle as same } from './angle';
import { nearestOnPieces } from './geometry';
import type { Gift, Origin, SnapCurve, SnapHit, SnapPoint, Suggestion } from './types';

const flip = (th: number, on: boolean) => (on ? th + Math.PI : th);

/** The direction of a snap line pointing away from the point `base` that made it (^313). */
function awayFrom(c: SnapCurve, base: Vec, pt: Vec): number | null {
  const piece = c.pieces[0];
  if (piece?.type !== 'line') return null;
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

/** A heading a suggestion gives, how far the point that made it is, and that point. */
interface Candidate {
  rank: number;
  th: number;
  far: number;
  origin?: Origin;
}

type Way = 'placed' | 'copied';

/** What a gift of a snap line gives: placed, the direction of its normal or along it (^318, ^793); copied, always away from its point (^313). */
function giftHeading(c: SnapCurve, g: Gift, pt: Vec, way: Way): number | null {
  if (way === 'copied' || g.along) return awayFrom(c, g.at, pt);
  return g.heading ?? null;
}

/** Whether a point gives a heading to a node: the node's side points (^253), where a node was picked up (^800), anything to a copied heading. */
const pointGives = (s: SnapPoint, way: Way) =>
  way === 'copied' || s.rule === 'previous' || (s.rule === 'node-points' && s.node === undefined);

/** The headings one suggestion gives at a place, each with the distance of the point that made it. */
function candidatesOf(s: Suggestion, pt: Vec, way: Way): Candidate[] {
  const rank = rankOf(s);
  if (s.kind === 'point') {
    const th = pointGives(s, way) ? s.heading : null;
    return th === null ? [] : [{ rank, th, far: dist(s.at, pt), origin: s.origin }];
  }
  if (isSegmentCurve(s)) return [segmentCandidate(s, pt, way)].flatMap((c) => c ?? []);
  return (s.straight ? (s.gives ?? []) : []).flatMap((g) => {
    const th = giftHeading(s, g, pt, way);
    return th === null ? [] : [{ rank, th, far: dist(g.at, pt), origin: g.origin }];
  });
}

/** The lane direction of the curve of a segment at a place; a node placed on the curve itself is merged into it, so it gets none (^317). */
function segmentCandidate(s: SnapCurve, pt: Vec, way: Way): Candidate | null {
  const th = way === 'placed' && s.rule === 'curve' ? null : laneAt(s, pt);
  const far = Math.min(...s.origins.map((o) => dist(o, pt)));
  return th === null ? null : { rank: rankOf(s), th, far };
}

/**
 * The heading the suggestions a snap is made of give (^793, ^792): of the most specific ones that
 * give a heading, the one whose point is closest to the place decides (the first one, if equally
 * close), so it does not depend on the order, and between two nodes that face each other it is the
 * heading of the nearer. The candidates that give that same heading are its sources (^795). A snap
 * on a point is that point's alone (it is more specific than any curve through it).
 */
function decide(hit: SnapHit, way: Way): { th: number; sources: Candidate[] } | null {
  const first = hit.by[0];
  const among = first?.kind === 'point' ? [first] : hit.by;
  const given = among.flatMap((s) => candidatesOf(s, hit.pt, way));
  const rank = Math.min(...given.map((g) => g.rank));
  const best = given.filter((g) => g.rank === rank);
  const near = best.reduce<Candidate | null>((a, g) => (a && a.far - g.far <= 1e-6 ? a : g), null);
  return near ? { th: near.th, sources: best.filter((g) => same(g.th, near.th)) } : null;
}

/**
 * The heading the heading control point takes from what it snapped to (^313): the heading of a snap
 * point, the direction of a snap line away from its base, the direction of a segment (the
 * opposite on its left, ^253). `Alt` inverts it (^301). Null if the suggestions have none.
 */
export function headingFrom(hit: SnapHit | null, alt: boolean): number | null {
  const th = hit ? decide(hit, 'copied')?.th : undefined;
  return th === undefined ? null : flip(th, alt);
}

/**
 * The heading a node placed or moved onto a snap gets (^254, ^253, ^317, ^318, ^793): beside another
 * node or on an offset curve of a segment the heading of that lane (right-hand traffic), on a snap
 * line the direction of its normal, on a tangent line the direction along it, away from its base;
 * back where it was picked up, its own. `Alt` takes the other one (^301). Null elsewhere.
 */
export function placedHeading(hit: SnapHit | null, alt: boolean): number | null {
  const th = hit ? decide(hit, 'placed')?.th : undefined;
  return th === undefined ? null : flip(th, alt);
}

/** The places in a list once: two within a millimeter are one. */
const uniqueOrigins = (list: (Origin | undefined)[]): Origin[] =>
  list.reduce<Origin[]>(
    (out, o) => (!o || out.some((x) => dist(x.at, o.at) < 1e-3) ? out : [...out, o]),
    [],
  );

/** The nodes and control points a snap is made of (^803): where its points and its lines come from, whatever they give. */
export function snapOrigins(hit: SnapHit | null): Origin[] {
  const made = (hit?.by ?? []).flatMap((s) =>
    s.kind === 'point' ? [s.origin] : (s.gives ?? []).map((g) => g.origin),
  );
  return uniqueOrigins(made);
}

/**
 * The points the heading of a snap comes from (^795): of the suggestions that gave it, those that a
 * node or a control point made (not the curve of a segment, which is shown already). `copied`: the
 * heading control point copies it (^313), else a node placed or moved onto it takes it (^254, ^793).
 */
export function headingSources(hit: SnapHit | null, copied: boolean): Origin[] {
  const given = hit && decide(hit, copied ? 'copied' : 'placed');
  return uniqueOrigins((given?.sources ?? []).map((c) => c.origin));
}

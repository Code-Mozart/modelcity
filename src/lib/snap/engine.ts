import { line } from '../curves/piece';
import { add, angleOf, dist, dot, mul, sub, type Vec } from '../curves/vec';
import { crossings, nearestOnPieces } from './geometry';
import type { SnapCurve, SnapHit, SnapPoint, Suggestion } from './types';

/** How near (screen pixels) a point must be to a suggestion to be pulled to it, and how far its origins may be (^101). */
export const SNAP_NEAR_PX = 25;
export const SNAP_REACH_PX = 300;

export interface SnapQuery {
  pt: Vec;
  /** Pixels per meter. */
  scale: number;
  /** Nodes whose suggestions are offered at any distance (^258). */
  pinned: readonly number[];
  /** What the thing that is moved can reach: only these suggestions are offered, and only these places (^333). */
  reach?: Reach;
}

/** What a control point can reach, for example the line it moves along (^333). */
export interface Reach {
  curve(c: SnapCurve): boolean;
  point(at: Vec): boolean;
  /** The line the thing moves along, if it does: curves are then reached where they cross it, not where they are nearest to the pointer (^830). */
  line?: { p: Vec; d: Vec };
}

/** Reaching this share of the maximum distance, the tip about pinning shows (^294). */
export const REACH_WARN = 0.85;

/** How far of the maximum distance the pointer is from the origins of the suggestions it snaps to, if they are limited (^294). */
function reachOf(by: Suggestion[], q: SnapQuery): number | null {
  const limited = by.filter(
    (s) => !(s.kind === 'curve' && !s.limited) && !s.from.some((id) => q.pinned.includes(id)),
  );
  const far = limited.map((s) => {
    const origins = s.kind === 'curve' ? s.origins : [s.at];
    return Math.min(...origins.map((o) => dist(o, q.pt))) * q.scale;
  });
  return far.length ? Math.max(...far) / SNAP_REACH_PX : null;
}

/** Whether a suggestion is offered at all: the pointer is near one of its origins, or one of its nodes is pinned. */
function offered(s: Suggestion, q: SnapQuery): boolean {
  if (s.kind === 'curve' && !s.limited) return true;
  if (s.from.some((id) => q.pinned.includes(id))) return true;
  const origins = s.kind === 'curve' ? s.origins : [s.at];
  return origins.some((o) => dist(o, q.pt) * q.scale <= SNAP_REACH_PX);
}

const nearPoint = (s: SnapPoint, q: SnapQuery) => dist(s.at, q.pt) * q.scale <= SNAP_NEAR_PX;

/** The curves within reach of the pointer, with their nearest point. */
function nearCurves(list: SnapCurve[], q: SnapQuery) {
  return list.flatMap((s) => {
    const n = nearestOnPieces(s.pieces, q.pt);
    return n && n.d * q.scale <= SNAP_NEAR_PX ? [{ s, n }] : [];
  });
}

/** The places where the near curves cross (^280), as points. */
function crossingPoints(near: { s: SnapCurve }[]): SnapPoint[] {
  const out: SnapPoint[] = [];
  near.forEach(({ s: a }, i) => {
    for (const { s: b } of near.slice(i + 1)) {
      const from = [...new Set([...a.from, ...b.from])];
      for (const at of crossings(a.pieces, b.pieces)) {
        out.push({ kind: 'point', at, heading: null, rule: 'crossing', from });
      }
    }
  });
  return out;
}

const FAR_M = 1e5;

/** The places where the curves cross the line a control point moves along (^830). */
function crossingsWithLine(curves: SnapCurve[], on: { p: Vec; d: Vec }): SnapPoint[] {
  const along = line(add(on.p, mul(on.d, -FAR_M)), add(on.p, mul(on.d, FAR_M)));
  return curves.flatMap((c) =>
    crossings(c.pieces, [along]).map((at): SnapPoint => ({
      kind: 'point',
      at,
      heading: null,
      rule: 'crossing',
      from: c.from,
    })),
  );
}

function pointHit(s: SnapPoint, by: Suggestion[]): SnapHit {
  return { pt: s.at, heading: s.heading, by };
}

/**
 * What a point is pulled to (^101): the nearest snap point, a crossing of two near curves counting
 * as one; else the nearest curve; nothing if none is near. Points beat curves, and only the nearest
 * of several curves is used, so no two parallel lines show at once (^102).
 */
export function snapTo(list: Suggestion[], query: SnapQuery): SnapHit | null {
  const q = onItsLine(query);
  const hit = snapNearest(list, q);
  return hit && { ...hit, reach: reachOf(hit.by, q) };
}

/**
 * A point that is tied to a line follows the pointer along it (^830): what it snaps to is judged
 * from the place on the line that is nearest to the pointer, and it snaps to points on the line only
 * (a line or a curve that crosses it is a point there, and one that does not cross it is not offered).
 */
function onItsLine(q: SnapQuery): SnapQuery {
  const on = q.reach?.line;
  return on ? { ...q, pt: add(on.p, mul(on.d, dot(sub(q.pt, on.p), on.d))) } : q;
}

const reaches = (s: Suggestion, reach?: Reach): boolean =>
  !reach || (s.kind === 'point' ? reach.point(s.at) : reach.curve(s));

function snapNearest(list: Suggestion[], q: SnapQuery): SnapHit | null {
  const here = list.filter((s) => offered(s, q) && reaches(s, q.reach));
  const near = nearCurves(
    here.filter((s): s is SnapCurve => s.kind === 'curve'),
    q,
  );
  const onLine = q.reach?.line
    ? crossingsWithLine(
        near.map((x) => x.s),
        q.reach.line,
      )
    : [];
  const crossed = [...crossingPoints(near), ...onLine];
  const points = [...here.filter((s): s is SnapPoint => s.kind === 'point'), ...crossed]
    .filter((s) => nearPoint(s, q) && (q.reach?.point(s.at) ?? true))
    .sort((a, b) => byPoint(a, b, q.pt));
  const best = points[0];
  if (best) {
    // A point and the curves that cross at it are all shown or all hidden (^289).
    const through = near.map((x) => x.s).filter((c) => touches(c, best.at));
    return pointHit(best, best.rule === 'crossing' ? through : [best, ...through]);
  }
  const curve = q.reach?.line ? undefined : near.sort(byNearness)[0];
  return curve
    ? { pt: curve.n.pt, heading: angleOf({ x: curve.n.tx, y: curve.n.ty }), by: [curve.s] }
    : null;
}

/**
 * Where a moved node was picked up comes first when points are at the same place (^800): it is the
 * node itself, with its own heading. Then a node, other points, and a crossing last (a crossing is computed, ^280).
 */
const pointRank = (p: SnapPoint) => {
  if (p.rule === 'previous') return -1;
  return p.node !== undefined ? 0 : p.rule === 'crossing' ? 2 : 1;
};
/** Points within this distance (meters) are one place: the nodes are whole millimeters, so a crossing and the side point of a node that are the same place differ by a tenth of a millimeter (^841). */
const SAME_PLACE_M = 1e-3;
const byPoint = (a: SnapPoint, b: SnapPoint, pt: Vec) => {
  const d = dist(a.at, pt) - dist(b.at, pt);
  return Math.abs(d) > SAME_PLACE_M ? d : pointRank(a) - pointRank(b);
};

/** The curve of a segment wins a tie with a line on top of it: it is the one a node can join (^268). */
const rank = (c: SnapCurve) => (c.rule === 'curve' ? 0 : c.rule === 'offset' ? 1 : 2);
const byNearness = (a: { s: SnapCurve; n: { d: number } }, b: typeof a) =>
  Math.abs(a.n.d - b.n.d) > 1e-6 ? a.n.d - b.n.d : rank(a.s) - rank(b.s);

/** The curves that are offered and pass through a place, whatever the pointer: shown with the point there (^289). */
export function curvesThrough(list: Suggestion[], at: Vec, q: SnapQuery): SnapCurve[] {
  const curves = list.filter((s): s is SnapCurve => s.kind === 'curve' && offered(s, q));
  return curves.filter((c) => touches(c, at));
}

const touches = (c: SnapCurve, at: Vec) => (nearestOnPieces(c.pieces, at)?.d ?? 1) < 1e-3;

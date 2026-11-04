import { angleOf, dist, type Vec } from '../curves/vec';
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

function pointHit(s: SnapPoint, by: Suggestion[]): SnapHit {
  return { pt: s.at, heading: s.heading, by };
}

/**
 * What a point is pulled to (^101): the nearest snap point, a crossing of two near curves counting
 * as one; else the nearest curve; nothing if none is near. Points beat curves, and only the nearest
 * of several curves is used, so no two parallel lines show at once (^102).
 */
export function snapTo(list: Suggestion[], q: SnapQuery): SnapHit | null {
  const hit = snapNearest(list, q);
  return hit && { ...hit, reach: reachOf(hit.by, q) };
}

const reaches = (s: Suggestion, reach?: Reach): boolean =>
  !reach || (s.kind === 'point' ? reach.point(s.at) : reach.curve(s));

function snapNearest(list: Suggestion[], q: SnapQuery): SnapHit | null {
  const here = list.filter((s) => offered(s, q) && reaches(s, q.reach));
  const near = nearCurves(
    here.filter((s): s is SnapCurve => s.kind === 'curve'),
    q,
  );
  const crossed = crossingPoints(near);
  const points = [...here.filter((s): s is SnapPoint => s.kind === 'point'), ...crossed]
    .filter((s) => nearPoint(s, q) && (q.reach?.point(s.at) ?? true))
    .sort((a, b) => byPoint(a, b, q.pt));
  const best = points[0];
  if (best) {
    // A point and the curves that cross at it are all shown or all hidden (^289).
    const through = near.map((x) => x.s).filter((c) => touches(c, best.at));
    return pointHit(best, best.rule === 'crossing' ? through : [best, ...through]);
  }
  const curve = near.sort(byNearness)[0];
  return curve
    ? { pt: curve.n.pt, heading: angleOf({ x: curve.n.tx, y: curve.n.ty }), by: [curve.s] }
    : null;
}

/** A node comes before other points and a crossing last when they are at the same place (a crossing is computed, ^280). */
const pointRank = (p: SnapPoint) => (p.node !== undefined ? 0 : p.rule === 'crossing' ? 2 : 1);
const byPoint = (a: SnapPoint, b: SnapPoint, pt: Vec) => {
  const d = dist(a.at, pt) - dist(b.at, pt);
  return Math.abs(d) > 1e-6 ? d : pointRank(a) - pointRank(b);
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

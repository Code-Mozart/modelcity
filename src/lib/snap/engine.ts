import { angleOf, dist, type Vec } from '../curves/vec';
import { crossings, nearestOnPieces } from './geometry';
import type { SnapCurve, SnapHit, SnapPoint, Suggestion } from './types';

/** How near (screen pixels) a point must be to a suggestion to be pulled to it, and how far its origins may be (^101). */
export const SNAP_NEAR_PX = 14;
export const SNAP_REACH_PX = 300;

export interface SnapQuery {
  pt: Vec;
  /** Pixels per meter. */
  scale: number;
  /** Nodes whose suggestions are offered at any distance (^258). */
  pinned: readonly number[];
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
  const here = list.filter((s) => offered(s, q));
  const near = nearCurves(
    here.filter((s): s is SnapCurve => s.kind === 'curve'),
    q,
  );
  const crossed = crossingPoints(near);
  const points = [...here.filter((s): s is SnapPoint => s.kind === 'point'), ...crossed]
    .filter((s) => nearPoint(s, q))
    .sort((a, b) => dist(a.at, q.pt) - dist(b.at, q.pt));
  const best = points[0];
  if (best) {
    const by =
      best.rule === 'crossing' ? near.map((x) => x.s).filter((c) => touches(c, best.at)) : [best];
    return pointHit(best, by);
  }
  const curve = near.sort((a, b) => a.n.d - b.n.d)[0];
  return curve
    ? { pt: curve.n.pt, heading: angleOf({ x: curve.n.tx, y: curve.n.ty }), by: [curve.s] }
    : null;
}

const touches = (c: SnapCurve, at: Vec) => (nearestOnPieces(c.pieces, at)?.d ?? 1) < 1e-6;

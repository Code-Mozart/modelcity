import { LANE_WIDTH_M } from '../curves/lane';
import { SAME_PLACE_M } from '../curves/tolerance';
import { add, angleOf, dist, dot, mul, sub, type Vec } from '../curves/vec';
import { crossingPoints, crossingsWithLine } from './crossingPoints';
import { nearestOnPieces } from './geometry';
import { RANK, type SnapCurve, type SnapHit, type SnapPoint, type Suggestion } from './types';

/** How near (screen pixels) a point must be to a suggestion to be pulled to it, and how far its origins may be (^101). */
export const SNAP_NEAR_PX = 25;
export const SNAP_REACH_PX = 300;
/** The distance within which snap points are shown around the pointer (^890). */
export const SNAP_SHOW_PX = 50;
/** Suggestions within these pixels of each other are one place, the one that ranks best wins (^883, ^880): the reach of a node (`NODE_HIT_PX`). */
export const MERGE_PX = { mouse: 9, touch: 16 };

export interface SnapQuery {
  pt: Vec;
  /** Pixels per meter. */
  scale: number;
  /** Nodes whose suggestions are offered at any distance (^258). */
  pinned: readonly number[];
  /** Whether the pointer is a finger: the pixels within which suggestions merge are more (^883). */
  touch?: boolean;
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

/**
 * All the snap points near the pointer, to show them (^890, ^804): those that are offered, that the
 * pointer can reach, within `SNAP_SHOW_PX` (more than the 25 px from which it snaps), the crossings
 * of the curves and lines that near included.
 */
export function nearbyPoints(list: Suggestion[], query: SnapQuery): SnapPoint[] {
  const q = onItsLine(query);
  return around(list, q, SNAP_SHOW_PX).points.filter(
    (s) =>
      s.rule !== 'previous' &&
      !s.quiet &&
      (q.reach?.point(s.at) ?? true) &&
      dist(s.at, q.pt) * q.scale <= SNAP_SHOW_PX,
  );
}

const nearPoint = (s: SnapPoint, q: SnapQuery) => dist(s.at, q.pt) * q.scale <= SNAP_NEAR_PX;

/** The curves within reach of the pointer, with their nearest point. */
function nearCurves(list: SnapCurve[], q: SnapQuery, px = SNAP_NEAR_PX) {
  return list.flatMap((s) => {
    const n = nearestOnPieces(s.pieces, q.pt);
    return n && n.d * q.scale <= px ? [{ s, n }] : [];
  });
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

/** The offered suggestions, the curves of them within `px` of the pointer, and the points there are: the given ones and the crossings of the curves (^280). */
function around(list: Suggestion[], q: SnapQuery, px: number) {
  const here = list.filter((s) => offered(s, q) && reaches(s, q.reach));
  const near = nearCurves(
    here.filter((s): s is SnapCurve => s.kind === 'curve'),
    q,
    px,
  );
  const onLine = q.reach?.line
    ? crossingsWithLine(
        near.map((x) => x.s),
        q.reach.line,
      )
    : [];
  const given = here.filter((s): s is SnapPoint => s.kind === 'point');
  // A crossing that is the place of a point (a node's side point, say) is that point: no second one (^842).
  const crossed = [...crossingPoints(near), ...onLine].filter(
    (c) => !given.some((g) => dist(g.at, c.at) < SAME_PLACE_M),
  );
  return { here, near, points: [...given, ...crossed] };
}

function snapNearest(list: Suggestion[], q: SnapQuery): SnapHit | null {
  const { here, near, points: all } = around(list, q, SNAP_NEAR_PX);
  const points = all
    .filter((s) => nearPoint(s, q) && (q.reach?.point(s.at) ?? true))
    .sort((a, b) => byPoint(a, b, q.pt));
  const best = bestOf(points, q);
  if (best) {
    // A point and the curves that cross at it are all shown or all hidden (^289).
    const through = near.map((x) => x.s).filter((c) => touches(c, best.at));
    return pointHit(best, best.rule === 'crossing' ? through : [best, ...through]);
  }
  const curve = q.reach?.line ? undefined : bestCurve(near, here, q);
  return curve
    ? { pt: curve.n.pt, heading: angleOf({ x: curve.n.tx, y: curve.n.ty }), by: [curve.s] }
    : null;
}

/**
 * The point that wins: the nearest one, or one that ranks better within `MERGE_PX` of it on the
 * screen (^883): the suggestions that are that near are one place, whose point is the best ranked.
 */
function bestOf(points: SnapPoint[], q: SnapQuery): SnapPoint | undefined {
  const nearest = points[0];
  if (!nearest) return undefined;
  const reach = MERGE_PX[q.touch ? 'touch' : 'mouse'] / q.scale;
  const here = points.filter((p) => dist(p.at, nearest.at) <= reach);
  // At the same place (within the tolerance) the first stays: the order of the list is the order of the nearest.
  return here.sort((a, b) => pointRank(a) - pointRank(b))[0];
}

/**
 * Where a moved node was picked up comes first when points are at the same place (^800): it is the
 * node itself, with its own heading. Then a node, other points, and a crossing last (a crossing is computed, ^280).
 */
const pointRank = (p: SnapPoint) => p.rank ?? RANK.crossing;
const byPoint = (a: SnapPoint, b: SnapPoint, pt: Vec) => {
  const d = dist(a.at, pt) - dist(b.at, pt);
  return Math.abs(d) > SAME_PLACE_M ? d : pointRank(a) - pointRank(b);
};

/**
 * The rank of a curve (^880): the curve of a segment, then an offset curve, then a snap line. An
 * offset curve whose segment is nearer to the pointer than a lane width, so the pointer is on the
 * side of the offset curve where the segment lies, ranks first of all (^866): a node there is too
 * close to the segment anyway.
 */
function curveRank(c: SnapCurve, q: SnapQuery, list: Suggestion[]): number {
  if (c.rule === 'curve') return 0;
  if (c.rule !== 'offset') return 2;
  const own = list.find((s) => s.kind === 'curve' && s.rule === 'curve' && s.edge === c.edge);
  const d = own?.kind === 'curve' ? nearestOnPieces(own.pieces, q.pt)?.d : undefined;
  return d !== undefined && d < LANE_WIDTH_M ? -1 : 1;
}

type Near = ReturnType<typeof nearCurves>[number];

/**
 * The curve that wins: the nearest, or one that ranks better within `MERGE_PX` of it on the screen
 * (^883): suggestions that near are one place, shown as the best ranked.
 */
function bestCurve(near: Near[], list: Suggestion[], q: SnapQuery): Near | undefined {
  const sorted = [...near].sort((a, b) => a.n.d - b.n.d);
  const nearest = sorted[0];
  if (!nearest) return undefined;
  const reach = MERGE_PX[q.touch ? 'touch' : 'mouse'] / q.scale;
  const here = sorted.filter((x) => x.n.d - nearest.n.d <= reach);
  return here.sort((a, b) => curveRank(a.s, q, list) - curveRank(b.s, q, list))[0];
}

/** The curves that are offered and pass through a place, whatever the pointer: shown with the point there (^289). */
export function curvesThrough(list: Suggestion[], at: Vec, q: SnapQuery): SnapCurve[] {
  const curves = list.filter((s): s is SnapCurve => s.kind === 'curve' && offered(s, q));
  return curves.filter((c) => touches(c, at));
}

const touches = (c: SnapCurve, at: Vec) => (nearestOnPieces(c.pieces, at)?.d ?? 1) < 1e-3;

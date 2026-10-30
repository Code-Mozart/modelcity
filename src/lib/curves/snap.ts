import { LANE_WIDTH_M } from './lane';
import { nearestOnCurve } from './path';
import type { Roads } from './roads';
import type { Sample } from './piece';
import { dot, sub, type Vec } from './vec';

/** A position next to another lane, one lane width away along its normal, heading along it (^22). */
export interface ParallelSnap {
  pt: Vec;
  /** Heading of the lane it runs alongside, pointing the way `travel` points (or the lane's way). */
  th: number;
  road: number;
}

export interface SnapOptions {
  /** How near (meters) the pointer must be to the line one lane width beside a road. */
  reach: number;
  /** A road that is not snapped to (the one being drawn or dragged). */
  exclude: number | null;
  /** The direction the new lane runs in, to head the same way as the other lane or the opposite. */
  travel?: Vec | null;
}

/** The point beside the curve point `at`, on the side of `pt`, and the heading to run along it. */
function besideLane(at: Sample, pt: Vec, travel: Vec | null): { pt: Vec; th: number } {
  const t = { x: at.tx, y: at.ty };
  const n = { x: -at.ty, y: at.tx };
  const rel = sub(pt, at);
  const side = dot(rel, n) < 0 ? -1 : 1;
  const along = dot(rel, t);
  const snapped = {
    x: at.x + t.x * along + n.x * side * LANE_WIDTH_M,
    y: at.y + t.y * along + n.y * side * LANE_WIDTH_M,
  };
  const flip = travel && dot(t, travel) < 0;
  return { pt: snapped, th: Math.atan2(t.y, t.x) + (flip ? Math.PI : 0) };
}

/**
 * Lanes run next to each other when they are one lane width apart (^22). If `pt` is within
 * `reach` of the line that runs one lane width beside a road (other than `exclude`), return the
 * point on that line and the heading that makes the new lane parallel.
 */
export function snapParallel(roads: Roads, pt: Vec, opts: SnapOptions): ParallelSnap | null {
  let best: (ParallelSnap & { off: number }) | null = null;
  roads.forEach((path, road) => {
    if (road === opts.exclude) return;
    const hit = nearestOnCurve(path, pt, LANE_WIDTH_M + opts.reach);
    const off = hit ? Math.abs(hit.d - LANE_WIDTH_M) : Infinity;
    if (!hit || off > opts.reach || (best && off >= best.off)) return;
    best = { ...besideLane(hit.at, pt, opts.travel ?? null), road, off };
  });
  const found = best as (ParallelSnap & { off: number }) | null;
  return found && { pt: found.pt, th: found.th, road: found.road };
}

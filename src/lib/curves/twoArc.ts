import { arcAround, line } from './piece';
import type { Arc, Dir, Line, PathNode } from './types';
import { TAU, add, angleOf, dist, dot, fromAngle, len, mod, mul, perp, sub, type Vec } from './vec';

export interface TwoArcSpec {
  R: number;
  s1: Dir;
  /** Both arcs turn the same way (hook) instead of opposite ways (S). */
  same: boolean;
}

export interface TwoArcGeom {
  /** Direction of the middle straight. */
  u: Vec;
  Ta: Vec;
  Tb: Vec;
  straight: number;
  pieces: [Arc, Line, Arc];
}

const leftNormal = (th: number): Vec => perp(fromAngle(th));

/** Centers closer than this (relative to the radius, at least 1 m) count as one circle. */
const COINCIDENT = 1e-6;

/** Direction of the middle straight: inner tangent for an S, outer tangent for a hook. */
function middleAngle(c1: Vec, c2: Vec, { R, s1, same }: TwoArcSpec): number | null {
  const D = dist(c1, c2);
  const base = angleOf(sub(c2, c1));
  if (same) return D < COINCIDENT * Math.max(1, R) ? null : base;
  return D < 2 * R * (1 - 1e-12) ? null : base + s1 * Math.asin(Math.min(1, (2 * R) / D));
}

/**
 * Both arcs share one circle (the centers coincide), so the middle straight has no length and
 * no direction of its own: split the one big arc in two equal halves. This is what a node whose
 * heading mirrors the previous one about the chord gets when the cursor is behind the arrow (^40).
 */
function halfwayAngle(p: PathNode, q: PathNode, s1: Dir): number {
  const total = mod(s1 * (q.th - p.th), TAU);
  return p.th + (s1 * total) / 2;
}

const sweepOf = (sense: number, from: number, to: number) => {
  const m = mod(sense * (to - from), TAU);
  return m > TAU - 1e-3 ? 0 : m;
};

/** Two equal-radius arcs anchored at both nodes, joined by a straight piece. */
export function twoArc(p: PathNode, q: PathNode, spec: TwoArcSpec): TwoArcGeom | null {
  const { R, s1, same } = spec;
  const s2: Dir = same ? s1 : (-s1 as Dir);
  const c1 = add(p, mul(leftNormal(p.th), s1 * R));
  const c2 = add(q, mul(leftNormal(q.th), s2 * R));
  const psi = middleAngle(c1, c2, spec) ?? (same ? halfwayAngle(p, q, s1) : null);
  if (psi == null) return null;
  const u = fromAngle(psi);
  const Ta = sub(c1, mul(perp(u), s1 * R));
  const Tb = sub(c2, mul(perp(u), s2 * R));
  const a1 = arcAround({ c: c1, r: R }, p, Ta, s1 * sweepOf(s1, p.th, psi));
  const a2 = arcAround({ c: c2, r: R }, Tb, q, s2 * sweepOf(s2, psi, q.th));
  return { u, Ta, Tb, straight: dist(Ta, Tb), pieces: [a1, line(Ta, Tb), a2] };
}

/** Largest radius for an S between p and q whose first turn has sense s1; null if none. */
export function sMax(p: PathNode, q: PathNode, s1: Dir): number | null {
  const n = mul(add(leftNormal(p.th), leftNormal(q.th)), s1);
  const w = sub(q, p);
  const A = dot(n, n) - 4;
  const wq = dot(w, n);
  const C0 = dot(w, w);
  const den = wq + Math.sqrt(Math.max(0, wq * wq - A * C0));
  return den > 1e-9 ? C0 / den : null;
}

/** Automatic radius for a hook and the largest radius allowed for it. */
export function hookAuto(p: PathNode, q: PathNode, s1: Dir): { R: number; cap: number } {
  const dn = sub(leftNormal(p.th), leftNormal(q.th));
  const w = sub(q, p);
  const d2 = dot(dn, dn);
  let R = d2 > 1e-9 ? (s1 * dot(w, dn)) / d2 : 0;
  if (!(R > 0.2)) R = len(w) / 4;
  return { R, cap: Math.max(R, len(w)) * 3 };
}

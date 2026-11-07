import { cornerArc, line } from './piece';
import { limitRadius } from './radius';
import { sMax, twoArc } from './twoArc';
import type { Dir, EdgeInput, MidLine, PathNode, TwoArcEdge } from './types';
import { add, cross, dist, dot, fromAngle, mid, mul, sub, type Vec } from './vec';

/** The middle line of the S whose arcs touch at the largest possible radius. */
function widestMiddle(p: PathNode, q: PathNode, s1: Dir): MidLine | null {
  const Rm = sMax(p, q, s1);
  const e = Rm ? twoArc(p, q, { R: Rm, s1, same: false }) : null;
  if (!e) return null;
  const m = mid(e.Ta, e.Tb);
  return { x: m.x, y: m.y, ux: e.u.x, uy: e.u.y };
}

interface Corners {
  u: Vec;
  k1: Vec;
  k2: Vec;
  a1: number;
  b2: number;
  L: number;
}

/** Where the two heading lines meet the middle line, or null if they do not do so properly. */
function corners(p: PathNode, q: PathNode, M: MidLine): Corners | null {
  const T1 = fromAngle(p.th);
  const T2 = fromAngle(q.th);
  const u = { x: M.ux, y: M.uy };
  const d1 = cross(T1, u);
  const d2 = cross(T2, u);
  if (Math.abs(d1) < 1e-4 || Math.abs(d2) < 1e-4) return null;
  const a1 = cross(sub(M, p), u) / d1;
  const b2 = -cross(sub(M, q), u) / d2;
  if (!(a1 > 1e-6 && b2 > 1e-6)) return null;
  const k1 = add(p, mul(T1, a1));
  const k2 = sub(q, mul(T2, b2));
  const L = dot(sub(k2, k1), u);
  return L > 1e-6 ? { u, k1, k2, a1, b2, L } : null;
}

const turnAngle = (from: Vec, to: Vec) => Math.atan2(cross(from, to), dot(from, to));

interface SShape {
  s1: Dir;
  /** The radii of the first and the second arc (equal for a lone S-curve, ^6; `R - w` and `R + w` beside another one, ^828). */
  R1: number;
  R2: number;
  Rmax: number;
  auto: boolean;
}

/** The S-curve of the corners and the radii: stubs, arcs and the middle line. */
function sShape(
  on: { p: PathNode; q: PathNode; M: MidLine; c: Corners },
  shape: SShape,
): TwoArcEdge {
  const { p, q, M, c } = on;
  const { s1, R1, R2 } = shape;
  const T1 = fromAngle(p.th);
  const T2 = fromAngle(q.th);
  const t1 = R1 * Math.tan(Math.abs(turnAngle(T1, c.u)) / 2);
  const t2 = R2 * Math.tan(Math.abs(turnAngle(c.u, T2)) / 2);
  const arc1 = cornerArc(sub(c.k1, mul(T1, t1)), T1, c.u, t1);
  const arc2 = cornerArc(sub(c.k2, mul(c.u, t2)), c.u, T2, t2);
  const [A1, B1, A2, B2] = [arc1.P, arc1.Q, arc2.P, arc2.Q];
  return {
    kind: 'S',
    s1,
    mid: M,
    k1: c.k1,
    k2: c.k2,
    J: { x: M.x, y: M.y },
    axis: { a: c.k1, b: c.k2 },
    straight: dist(B1, A2),
    R: Math.min(R1, R2),
    Rmax: shape.Rmax,
    auto: shape.auto,
    pieces: [line(p, A1), arc1, line(B1, A2), arc2, line(B2, q)],
  };
}

/** The corners of an S-curve on a middle line, if its turns have the right senses (^6). */
function sCorners(p: PathNode, q: PathNode, M: MidLine, s1: Dir) {
  const c = corners(p, q, M);
  if (!c) return null;
  const f1 = turnAngle(fromAngle(p.th), c.u);
  const f2 = turnAngle(c.u, fromAngle(q.th));
  return Math.sign(f1) === s1 && Math.sign(f2) === -s1 ? { c, f1, f2 } : null;
}

/**
 * The S-curve (^6): arc, straight through the inflection point, arc; both arcs share one radius
 * and leave straight stubs to the nodes when the radius is below the largest that fits.
 * Null if the (stored or widest) middle line does not give a valid S.
 */
export function reverseEdge({ p, q, Rs }: EdgeInput, s1: Dir, mid0?: MidLine): TwoArcEdge | null {
  const M = mid0 ?? widestMiddle(p, q, s1);
  const k = M ? sCorners(p, q, M, s1) : null;
  if (!M || !k) return null;
  const tn1 = Math.tan(Math.abs(k.f1) / 2);
  const tn2 = Math.tan(Math.abs(k.f2) / 2);
  const Rmax = Math.min(k.c.a1 / tn1, k.c.b2 / tn2, k.c.L / (tn1 + tn2));
  const R = limitRadius(Rs, Rmax);
  return sShape({ p, q, M, c: k.c }, { s1, R1: R, R2: R, Rmax, auto: Rs == null });
}

/**
 * An S-curve on a given middle line with two radii (^828): the lane beside another S-curve has
 * the radii `R - w` and `R + w`, so that it is concentric with it. Null if it does not fit.
 */
export function twoRadiiEdge(
  p: PathNode,
  q: PathNode,
  on: { mid: MidLine; s1: Dir },
  shape: { R1: number; R2: number; Rmax: number; auto: boolean },
): TwoArcEdge | null {
  const k = sCorners(p, q, on.mid, on.s1);
  if (!k) return null;
  const t1 = shape.R1 * Math.tan(Math.abs(k.f1) / 2);
  const t2 = shape.R2 * Math.tan(Math.abs(k.f2) / 2);
  const fits = t1 <= k.c.a1 + 1e-6 && t2 <= k.c.b2 + 1e-6 && t1 + t2 <= k.c.L + 1e-6;
  return fits ? sShape({ p, q, M: on.mid, c: k.c }, { s1: on.s1, ...shape }) : null;
}

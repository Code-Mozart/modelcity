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

/**
 * The S-curve (^6): arc, straight through the inflection point, arc; both arcs share one radius
 * and leave straight stubs to the nodes when the radius is below the largest that fits.
 * Null if the (stored or widest) middle line does not give a valid S.
 */
export function reverseEdge({ p, q, Rs }: EdgeInput, s1: Dir, mid0?: MidLine): TwoArcEdge | null {
  const M = mid0 ?? widestMiddle(p, q, s1);
  const c = M ? corners(p, q, M) : null;
  if (!M || !c) return null;
  const T1 = fromAngle(p.th);
  const T2 = fromAngle(q.th);
  const f1 = turnAngle(T1, c.u);
  const f2 = turnAngle(c.u, T2);
  if (Math.sign(f1) !== s1 || Math.sign(f2) !== -s1) return null;
  const tn1 = Math.tan(Math.abs(f1) / 2);
  const tn2 = Math.tan(Math.abs(f2) / 2);
  const Rmax = Math.min(c.a1 / tn1, c.b2 / tn2, c.L / (tn1 + tn2));
  const R = limitRadius(Rs, Rmax);
  const t1 = R * tn1;
  const t2 = R * tn2;
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
    R,
    Rmax,
    auto: Rs == null,
    ticks: [
      { at: A1, dir: T1, role: 'blue' },
      { at: B1, dir: c.u, role: 'teal' },
      { at: A2, dir: c.u, role: 'teal' },
      { at: B2, dir: T2, role: 'blue' },
    ],
    pieces: [line(p, A1), arc1, line(B1, A2), arc2, line(B2, q)],
  };
}

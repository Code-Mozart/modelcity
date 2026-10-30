import { hookAuto, sMax, twoArc, type TwoArcSpec } from './twoArc';
import { limitRadius, RMIN } from './radius';
import type { Dir, EdgeInput, PathNode, TwoArcEdge } from './types';
import { add, cross, fromAngle, mid, mul, sub, type Vec } from './vec';

/** Where the heading line of node n (heading T) meets the middle straight through `along`. */
function headingCorner(n: PathNode, T: Vec, along: Vec, u: Vec): Vec | null {
  const d = cross(T, u);
  if (Math.abs(d) <= 1e-3) return null;
  return add(n, mul(T, cross(sub(along, n), u) / d));
}

interface Radius {
  R: number;
  Rmax: number;
  spec: TwoArcSpec;
}

function radiusFor({ p, q, Rs }: EdgeInput, kind: 'S' | 'H', s1: Dir): Radius | null {
  if (kind === 'S') {
    const Rmax = sMax(p, q, s1);
    if (!Rmax) return null;
    const R = limitRadius(Rs, Rmax);
    return { R, Rmax, spec: { R, s1, same: false } };
  }
  const hk = hookAuto(p, q, s1);
  const R = Math.max(Rs == null ? hk.R : Math.min(Rs, hk.cap), RMIN);
  return { R, Rmax: hk.cap, spec: { R, s1, same: true } };
}

/**
 * Two equal arcs anchored at the nodes joined by a straight piece (inner tangent for S, outer
 * tangent for hooks). Used for hooks, and for S-curves whose middle line does not fit (^6).
 */
export function anchoredEdge(inp: EdgeInput, kind: 'S' | 'H', s1: Dir): TwoArcEdge | null {
  const { p, q, Rs } = inp;
  const rad = radiusFor(inp, kind, s1);
  const e = rad ? twoArc(p, q, rad.spec) : null;
  if (!rad || !e) return null;
  return {
    kind,
    s1,
    R: rad.R,
    Rmax: rad.Rmax,
    auto: Rs == null,
    k1: headingCorner(p, fromAngle(p.th), e.Ta, e.u),
    k2: headingCorner(q, fromAngle(q.th), e.Tb, e.u),
    J: mid(e.Ta, e.Tb),
    axis: { a: e.Ta, b: e.Tb },
    straight: e.straight,
    ticks: [
      { at: e.Ta, dir: e.u, role: 'yellow' },
      { at: e.Tb, dir: e.u, role: 'yellow' },
    ],
    pieces: e.pieces,
  };
}

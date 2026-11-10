import type { Arc, Line, Piece } from './types';
import {
  TAU,
  add,
  angleOf,
  cross,
  dist,
  dot,
  mod,
  mul,
  onCircle,
  perp,
  sub,
  type Vec,
} from './vec';

/**
 * The corner arc from P with start tangent T to end tangent U, where both tangent lengths are d.
 * Degenerates to a line when T and U are parallel.
 */
export function cornerArc(P: Vec, T: Vec, U: Vec, d: number): Piece {
  const phi = Math.atan2(cross(T, U), dot(T, U));
  const Q = add(add(P, mul(T, d)), mul(U, d));
  if (Math.abs(phi) < 1e-5) return { type: 'line', P, Q };
  const r = d / Math.tan(Math.abs(phi) / 2);
  const c = add(P, mul(perp(T), Math.sign(phi) * r));
  return { type: 'arc', P, Q, c, r, a0: angleOf(sub(P, c)), da: phi };
}

export const line = (P: Vec, Q: Vec): Line => ({ type: 'line', P, Q });

export function arcAround({ c, r }: { c: Vec; r: number }, P: Vec, Q: Vec, da: number): Arc {
  return { type: 'arc', P, Q, c, r, a0: angleOf(sub(P, c)), da };
}

/** An arc that actually turns (others are drawn and handled as nothing). */
export const sweeps = (p: Piece): p is Arc => p.type === 'arc' && Math.abs(p.da) > 1e-3;

/** The same piece run the other way. */
export const reversePiece = (p: Piece): Piece =>
  p.type === 'line'
    ? { type: 'line', P: p.Q, Q: p.P }
    : { ...p, P: p.Q, Q: p.P, a0: p.a0 + p.da, da: -p.da };

export const isDegenerate = (p: Piece) =>
  p.type === 'line' ? dist(p.P, p.Q) < 1e-3 : Math.abs(p.da) < 1e-3;

export interface Sample extends Vec {
  /** Unit tangent. */
  tx: number;
  ty: number;
}

/** Point and tangent at parameter t in [0, 1] along a piece. */
export function pointOn(piece: Piece, t: number): Sample {
  if (piece.type === 'line') {
    const dx = piece.Q.x - piece.P.x;
    const dy = piece.Q.y - piece.P.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: piece.P.x + dx * t, y: piece.P.y + dy * t, tx: dx / l, ty: dy / l };
  }
  const an = piece.a0 + piece.da * t;
  const sg = Math.sign(piece.da);
  return {
    ...onCircle(piece.c, piece.r, an),
    tx: -sg * Math.sin(an),
    ty: sg * Math.cos(an),
  };
}

export const pieceLength = (p: Piece) =>
  p.type === 'line' ? dist(p.P, p.Q) : p.r * Math.abs(p.da);

/** The parameter t in [0, 1] of the point of a piece nearest to `p` (exact, not sampled). */
export function nearestParam(piece: Piece, p: Vec): number {
  if (piece.type === 'line') {
    const d = sub(piece.Q, piece.P);
    const l2 = dot(d, d);
    return l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, piece.P), d) / l2)) : 0;
  }
  const sweep = Math.abs(piece.da);
  const along = mod(Math.sign(piece.da) * (angleOf(sub(p, piece.c)) - piece.a0), TAU);
  if (along <= sweep) return along / sweep;
  return dist(p, piece.P) <= dist(p, piece.Q) ? 0 : 1;
}

/** Distance from a point to the nearest point of a piece (exact, not sampled). */
export const distanceToPiece = (piece: Piece, p: Vec): number =>
  dist(p, pointOn(piece, nearestParam(piece, p)));

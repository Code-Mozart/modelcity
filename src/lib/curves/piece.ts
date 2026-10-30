import type { Arc, Line, Piece } from './types';
import { add, cross, dist, dot, mul, perp, type Vec } from './vec';

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
  return { type: 'arc', P, Q, c, r, a0: Math.atan2(P.y - c.y, P.x - c.x), da: phi };
}

export const line = (P: Vec, Q: Vec): Line => ({ type: 'line', P, Q });

export function arcAround({ c, r }: { c: Vec; r: number }, P: Vec, Q: Vec, da: number): Arc {
  return { type: 'arc', P, Q, c, r, a0: Math.atan2(P.y - c.y, P.x - c.x), da };
}

/** An arc that actually turns (others are drawn and handled as nothing). */
export const sweeps = (p: Piece): p is Arc => p.type === 'arc' && Math.abs(p.da) > 1e-3;

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
    x: piece.c.x + piece.r * Math.cos(an),
    y: piece.c.y + piece.r * Math.sin(an),
    tx: -sg * Math.sin(an),
    ty: sg * Math.cos(an),
  };
}

export const pieceLength = (p: Piece) =>
  p.type === 'line' ? dist(p.P, p.Q) : p.r * Math.abs(p.da);

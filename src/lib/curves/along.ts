import { distanceToPiece, nearestParam, pieceLength, pointOn, type Sample } from './piece';
import type { Piece } from './types';
import type { Loop } from './union';
import type { Vec } from './vec';

/** The length of a closed loop of pieces (meters). */
export const loopLength = (loop: Loop): number => loop.reduce((n, p) => n + pieceLength(p), 0);

/**
 * The place `s` meters along a loop from its start, going round: past the end it starts again,
 * and a negative `s` goes backwards from the start (^948). Null for a loop with no length.
 */
export function alongLoop(loop: Loop, s: number): Sample | null {
  const total = loopLength(loop);
  if (!(total > 0)) return null;
  let rest = ((s % total) + total) % total;
  for (const p of loop) {
    const l = pieceLength(p);
    if (rest <= l) return pointOn(p, l > 0 ? rest / l : 0);
    rest -= l;
  }
  return pointOn(loop[loop.length - 1]!, 1);
}

/** How far along a curve (meters from its start) the place on it nearest to `p` is. */
export function lengthTo(curve: Piece[], p: Vec): number {
  let [acc, best, at] = [0, Infinity, 0];
  for (const piece of curve) {
    const d = distanceToPiece(piece, p);
    if (Number.isFinite(d) && d < best)
      [best, at] = [d, acc + nearestParam(piece, p) * pieceLength(piece)];
    acc += pieceLength(piece);
  }
  return at;
}

/** The part of a piece between the parameters `t0` and `t1`. */
function partOf(p: Piece, t0: number, t1: number): Piece {
  if (t0 <= 0 && t1 >= 1) return p;
  const [a, b] = [pointOn(p, t0), pointOn(p, t1)];
  const [P, Q] = [
    { x: a.x, y: a.y },
    { x: b.x, y: b.y },
  ];
  return p.type === 'line'
    ? { type: 'line', P, Q }
    : { ...p, P, Q, a0: p.a0 + p.da * t0, da: p.da * (t1 - t0) };
}

/** The part of a curve from `s0` to `s1` meters along it. */
export function between(curve: Piece[], s0: number, s1: number): Piece[] {
  const out: Piece[] = [];
  let acc = 0;
  for (const p of curve) {
    const l = pieceLength(p);
    const [a, b] = [Math.max(s0 - acc, 0), Math.min(s1 - acc, l)];
    if (l > 0 && b - a > 1e-9) out.push(partOf(p, a / l, b / l));
    acc += l;
  }
  return out;
}

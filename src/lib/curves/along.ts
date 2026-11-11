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

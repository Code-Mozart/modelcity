import { isDegenerate } from './piece';
import type { Piece } from './types';
import { add, fromAngle, mul, perp, sub, unitOr, type Vec } from './vec';

/** An arc whose offset would have a smaller radius than this turns inside out: it is left out (the radius is at least 0.5 m, ^57). */
const MIN_OFFSET_RADIUS_M = 0.05;

/**
 * A piece moved sideways by `d`: on the screen (y down) a positive `d` is on the right-hand side of
 * the direction of travel (^253), a negative one on the left. Null where an arc would turn inside out.
 */
export function offsetPiece(p: Piece, d: number): Piece | null {
  if (p.type === 'line') {
    const n = mul(perp(unitOr(sub(p.Q, p.P), { x: 1, y: 0 })), d);
    return { type: 'line', P: add(p.P, n), Q: add(p.Q, n) };
  }
  const r = p.r - Math.sign(p.da) * d;
  if (r < MIN_OFFSET_RADIUS_M) return null;
  const at = (a: number): Vec => add(p.c, mul(fromAngle(a), r));
  return { ...p, r, P: at(p.a0), Q: at(p.a0 + p.da) };
}

/** A curve moved sideways by `d` (pieces that do not turn nor run are left out, and so are arcs that would turn inside out). */
export const offsetCurve = (pieces: Piece[], d: number): Piece[] =>
  pieces
    .filter((p) => !isDegenerate(p))
    .flatMap((p) => {
      const moved = offsetPiece(p, d);
      return moved ? [moved] : [];
    });

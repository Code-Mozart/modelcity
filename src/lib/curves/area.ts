import type { Piece } from './types';
import { cross } from './vec';

/**
 * The area inside a closed loop of pieces (square meters), whichever way it runs: the polygon of
 * its corners, and for each arc the sliver between the arc and its chord.
 */
export function loopArea(loop: Piece[]): number {
  const signed = loop.reduce((sum, p) => {
    const sliver = p.type === 'arc' ? (p.r * p.r * (p.da - Math.sin(p.da))) / 2 : 0;
    return sum + cross(p.P, p.Q) / 2 + sliver;
  }, 0);
  return Math.abs(signed);
}

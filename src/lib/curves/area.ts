import { boxAround } from './hull';
import { distanceToPiece } from './piece';
import type { Piece } from './types';
import { insideOf } from './union';
import { cross, type Vec } from './vec';

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

/** How many samples across the box of a loop the first search for the widest place has, and the finer ones round the best. */
const SEARCH_GRID = 16;
const REFINE_ROUNDS = 3;

/** How far a place inside a loop is from its outline (meters). */
const clearance = (loop: Piece[], p: Vec) =>
  Math.min(...loop.map((piece) => distanceToPiece(piece, p)));

/**
 * The radius of the largest circle that fits inside a loop (^1054): the width of the loop at its
 * widest place, half of it. Found by looking at a grid of places inside the loop and then at finer
 * grids round the best one (a few hundred distances to its pieces): a loop is a few pieces, and
 * there are few holes. With `enough`, the search stops as soon as a circle that big fits (the answer
 * is then only known to be at least that, which is all a caller that compares with it needs, ^941).
 */
export function inscribedRadius(loop: Piece[], enough = Infinity): number {
  const box = boxAround(loop);
  const inside = insideOf([loop]);
  let best = { p: { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }, r: 0 };
  let reach = Math.max(box.x1 - box.x0, box.y1 - box.y0) / 2;
  for (let round = 0; round <= REFINE_ROUNDS; round++) {
    best = widestAround({ loop, inside, enough }, best, reach);
    if (best.r >= enough) break;
    reach = ((2 * reach) / SEARCH_GRID) * 1.5;
  }
  return best.r;
}

/** The widest of a grid of places inside a loop round `from`, `reach` meters to each side, or `from` if none is wider. */
function widestAround(
  { loop, inside, enough }: { loop: Piece[]; inside: (p: Vec) => boolean; enough: number },
  from: { p: Vec; r: number },
  reach: number,
) {
  const step = (2 * reach) / SEARCH_GRID;
  let best = from;
  for (let k = 0; k < (SEARCH_GRID + 1) ** 2; k++) {
    const p = {
      x: from.p.x - reach + (k % (SEARCH_GRID + 1)) * step,
      y: from.p.y - reach + Math.floor(k / (SEARCH_GRID + 1)) * step,
    };
    const r = inside(p) ? clearance(loop, p) : 0;
    if (r > best.r) best = { p, r };
    if (best.r >= enough) break;
  }
  return best;
}

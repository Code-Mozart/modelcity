import { Grid } from './grid';
import { boxesMeet, type Box } from './hull';
import type { Piece } from './types';

/** The size of a cell of the grid of the changes (meters). */
const CHANGE_CELL_M = 50;

/** A text that tells two pieces apart exactly (every number in full). */
export const pieceKey = (p: Piece): string =>
  p.type === 'line'
    ? `l${p.P.x},${p.P.y},${p.Q.x},${p.Q.y}`
    : `a${p.P.x},${p.P.y},${p.Q.x},${p.Q.y},${p.c.x},${p.c.y},${p.r},${p.a0},${p.da}`;

/**
 * What was computed for the same input the last time, as long as nothing that it depends on has
 * changed (^941): a result is kept per key (the content of its input, never an object's identity),
 * and a result is used again if no box of what changed since the last run meets its own box. The
 * caller says what the results depend on with `begin`: every thing near a result that can change it,
 * with the key and box of each. A result that is not used again is computed, so a wrong answer is
 * only possible if a result depends on something that is not in that list (the tests compare with
 * a run that has no memory, on random edits).
 */
export class Memo<V> {
  private old = new Map<string, V>();
  private fresh = new Map<string, V>();
  private seen = new Map<string, Box>();
  private changes = new Grid<Box>(CHANGE_CELL_M);

  /** Starts a run: `now` is the key and box of everything that results may depend on. */
  begin(now: Map<string, Box>) {
    this.changes = new Grid<Box>(CHANGE_CELL_M);
    for (const [k, b] of now) if (!this.seen.has(k)) this.changes.add(b, b);
    for (const [k, b] of this.seen) if (!now.has(k)) this.changes.add(b, b);
    this.seen = now;
    this.old = this.fresh;
    this.fresh = new Map();
  }

  /** The result for `key`, whose reach is `box`: the one of the last run if nothing changed in the box, else `compute()`. */
  get(key: string, box: Box, compute: () => V): V {
    let v = this.old.get(key);
    if (v === undefined || this.touched(box)) v = compute();
    this.fresh.set(key, v);
    return v;
  }

  private touched(box: Box): boolean {
    let hit = false;
    this.changes.each(box, (b) => {
      hit ||= boxesMeet(b, box);
    });
    return hit;
  }
}

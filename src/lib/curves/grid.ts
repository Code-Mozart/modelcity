import type { Box } from './hull';

/**
 * A grid of cells that finds the items near a place without looking at all of them (^938): each
 * item is put in every cell its box touches, and a query visits the cells its box touches. A
 * cell holds a few items when the cell size is about the size of the items, so a question costs
 * what is near and not what there is. The cell of an item is a number, not a string (no garbage).
 */
export class Grid<T> {
  private cells = new Map<number, T[]>();

  /** `size` meters wide cells and `height` meters tall (as wide, if not given): thin rows suit a ray that runs along x (^941). */
  constructor(
    private size: number,
    private height = size,
  ) {}

  private index = (v: number) => Math.floor(v / this.size);
  private row = (v: number) => Math.floor(v / this.height);
  private key = (ix: number, iy: number) => (ix + 2 ** 20) * 2 ** 21 + (iy + 2 ** 20);

  add(item: T, b: Box) {
    for (let ix = this.index(b.x0); ix <= this.index(b.x1); ix++) {
      for (let iy = this.row(b.y0); iy <= this.row(b.y1); iy++) {
        const k = this.key(ix, iy);
        const cell = this.cells.get(k);
        if (cell) cell.push(item);
        else this.cells.set(k, [item]);
      }
    }
  }

  /** Every item in a cell the box touches, each once (it may lie a little outside the box: the caller tests it). */
  near(b: Box): Set<T> {
    const found = new Set<T>();
    for (let ix = this.index(b.x0); ix <= this.index(b.x1); ix++) {
      for (let iy = this.row(b.y0); iy <= this.row(b.y1); iy++) {
        this.cells.get(this.key(ix, iy))?.forEach((item) => found.add(item));
      }
    }
    return found;
  }

  /** Calls `visit` for every item in a cell the box touches, an item once for each such cell (no set is made: a caller that must not see one twice marks it itself, ^941). */
  each(b: Box, visit: (item: T) => void) {
    for (let ix = this.index(b.x0); ix <= this.index(b.x1); ix++) {
      for (let iy = this.row(b.y0); iy <= this.row(b.y1); iy++) {
        this.cells.get(this.key(ix, iy))?.forEach(visit);
      }
    }
  }
}

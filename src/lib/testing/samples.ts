import { add, type Vec } from '../curves/vec';
import { roundToMm, type Graph } from '../model/graph';
import { junction, ALPHAS, BETAS } from './angleGround';
import { Sketch } from './junctionKit';

/** The sample projects of different sizes for the benchmarks (^929), made again from nothing, always the same. */
export interface Sample {
  name: string;
  graph: Graph;
}

const CELL: Vec = { x: 260, y: 240 };

/**
 * A map of about `cells` 3-way junctions of three arms of 1+1 (the cases of the angle ground, in turn),
 * in a square grid of cells 260 by 240 m: each has 12 nodes and 12 segments. The shapes that cost
 * something are all there: lane changes, junctions with turns missing, towers.
 */
export function tiledMap(cells: number): Graph {
  const s = new Sketch();
  const columns = Math.ceil(Math.sqrt(cells));
  for (let n = 0; n < cells; n++) {
    const at = add(
      { x: 0, y: 0 },
      { x: (n % columns) * CELL.x, y: Math.floor(n / columns) * CELL.y },
    );
    junction(s, at, n % (2 * ALPHAS.length * BETAS.length));
  }
  return roundToMm(s.graph);
}

/** The sizes in cells, small to large: about 12 nodes a cell. */
export const SIZES = [4, 27, 54, 250, 1000, 8000, 80000, 250000];

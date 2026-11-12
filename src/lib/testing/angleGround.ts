import { add, type Vec } from '../curves/vec';
import { roundToMm, type Graph } from '../model/graph';
import type { GroundCase } from './junctionGround';
import { place, Sketch } from './junctionKit';
import { lanesOf, type Lanes } from './tGround';

/**
 * The testing ground of the angles of three-way nodes (^1145): a matrix of 3-way junctions of
 * three arms of 1+1, the bend A to B with the angle alpha and the third arm C at the angle beta
 * counter-clockwise from B (^1142: a T has alpha 90 and beta 90 or 180; the symmetric Y alpha 120
 * and beta 120). Three alphas by nine betas, once with all turns (cases ^1146 to ^1172, the layout
 * of the arrows: split or ahead and right, ^1144) and once with turns missing, always others and
 * sometimes several (^1173 to ^1199, the stress test). The project file is
 * `docs/mocks/hat1145.json` (`angleGround.test`).
 */
export const ALPHAS = [15, 90, 120];
export const BETAS = [15, 45, 90, 120, 135, 150, 165, 180, 210];
const CELL: Vec = { x: 260, y: 240 };
const FIRST_HAT = 1146;
const SIZE = ALPHAS.length * BETAS.length;

/** Missing connections as [arm of the lane in, arm of the lane out]: 0 is A, 1 is B, 2 is C. */
export const MISSING: [number, number][][] = [
  [[0, 1]],
  [[1, 0]],
  [[0, 2]],
  [[2, 0]],
  [[1, 2]],
  [[2, 1]],
  [
    [0, 1],
    [1, 0],
  ],
  [
    [0, 1],
    [0, 2],
  ],
  [
    [1, 2],
    [2, 1],
  ],
  [
    [2, 0],
    [2, 1],
  ],
  [
    [0, 2],
    [1, 2],
  ],
  [
    [0, 1],
    [2, 0],
    [1, 2],
  ],
];

const rad = (deg: number) => (deg * Math.PI) / 180;
const cellAt = (n: number): Vec => ({
  x: (n % BETAS.length) * CELL.x,
  y: Math.floor(n / BETAS.length) * CELL.y,
});

/** The angles of cell `n` (of both matrices): alpha, beta, and the connections missing there. */
export function angleOf(n: number): { alpha: number; beta: number; skip: [number, number][] } {
  const m = n % SIZE;
  return {
    alpha: ALPHAS[Math.floor(m / BETAS.length)]!,
    beta: BETAS[m % BETAS.length]!,
    skip: n < SIZE ? [] : MISSING[(m * 5) % MISSING.length]!,
  };
}

/** One 3-way junction at `c`: B heads south, A is alpha clockwise of it, C beta counter-clockwise (y is down). */
function junction(s: Sketch, c: Vec, n: number) {
  const { alpha, beta, skip } = angleOf(n);
  const heads = [Math.PI / 2 + rad(alpha), Math.PI / 2, Math.PI / 2 - rad(beta)];
  const lanes: Lanes[] = heads.map((h) =>
    lanesOf(
      s,
      { at: place(add(c, { x: 0, y: 0 }), h, 6, 0), h },
      { stop: [6, 6], which: 'both', behind: 40 },
    ),
  );
  lanes.forEach((from, i) =>
    lanes.forEach((to, j) => {
      const missing = skip.some(([a, b]) => a === i && b === j);
      if (i !== j && from.in !== null && to.out !== null && !missing) s.edge(from.in, to.out);
    }),
  );
}

export function angleGround(): Graph {
  const s = new Sketch();
  for (let n = 0; n < 2 * SIZE; n++) junction(s, cellAt(n), n);
  return roundToMm(s.graph);
}

export const ANGLE_CASES: GroundCase[] = Array.from({ length: 2 * SIZE }, (_, n) => {
  const { alpha, beta, skip } = angleOf(n);
  const lost = skip.map(([a, b]) => `${'ABC'[a]}${'ABC'[b]}`).join(' ');
  return {
    hat: FIRST_HAT + n,
    name: `3-way node, alpha ${alpha}, beta ${beta}${lost ? `, without ${lost}` : ''}`,
    views: [{ center: cellAt(n), span: 50 }],
  };
});

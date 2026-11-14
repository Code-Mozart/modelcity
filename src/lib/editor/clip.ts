import { alongLoop, between, loopLength } from '../curves/along';
import { MARKING_WIDTH_M } from '../curves/lane';
import { boxAround, type Box } from '../curves/hull';
import { Memo, pieceKey } from '../curves/memo';
import { reversePiece } from '../curves/piece';
import { SAME_PLACE_M } from '../curves/tolerance';
import { insideOf, RAY_SLOPE, type Loop } from '../curves/union';
import type { Piece } from '../curves/types';
import { perp, type Vec } from '../curves/vec';
import type { Marking } from './markings';

/** How far apart the places are where a line is tested against the surface (meters). */
const STEP_M = 0.5;
/** How many times an end of a part that is on the surface is halved to find where it stops. */
const REFINE = 14;

/**
 * Dashed lines are drawn only where their stroke, edge to edge, lies on the road surface (the
 * general rule of the dashed lines): they stop where the outer edge of the stroke would meet the
 * outline of the surface. Solid lines are left as they are.
 */
export function clipToSurface(
  lines: Marking[],
  surface: Loop[],
  memory: Memo<[number, number][]> = remembered,
): Marking[] {
  let test: ((p: Vec) => boolean) | undefined;
  const on = (p: Vec) => (test ??= insideOf(surface))(p);
  const skin = skinOf(surface);
  const right = Math.max(...[...skin.values()].map((b) => b.x1));
  memory.begin(skin);
  return lines.flatMap((m) => {
    if (m.kind !== 'dashed') return [m];
    const key = m.pieces.map(pieceKey).join('|');
    const reach = alongRay(boxAround(m.pieces), right);
    const parts = memory.get(key, reach, () => partsOf(m, on));
    return parts.map(([a, b]) => ({ ...m, pieces: between(m.pieces, a, b) }));
  });
}

/** What was cut from each dashed line the last time (^941): the stretches that fit, as long as the surface near the line is as it was. */
const remembered = new Memo<[number, number][]>();

/**
 * What the test of a place on the line looks at: the stroke, and the rays of the points, which run
 * to the right edge of the surface (the pieces they meet decide, not only those near).
 */
const alongRay = (b: Box, right: number): Box => {
  const m = MARKING_WIDTH_M + SAME_PLACE_M;
  return {
    x0: b.x0 - m,
    x1: Math.max(b.x1, right) + m,
    y0: b.y0 - m,
    y1: b.y1 + m + (Math.max(b.x1, right) - b.x0) * RAY_SLOPE,
  };
};

/** The key of a piece that does not depend on its direction (a loop may be chained the other way round). */
const loose = (p: Piece): string => [pieceKey(p), pieceKey(reversePiece(p))].sort()[0]!;

/** The pieces of the outline of the surface, by key, with their boxes: what the clipped lines depend on. */
function skinOf(surface: Loop[]): Map<string, Box> {
  const skin = new Map<string, Box>();
  for (const loop of surface) {
    // Which loops hold a place (their boxes) decides which pieces its ray counts.
    const box = boxAround(loop);
    let own = `box${box.x0},${box.x1},${box.y0},${box.y1}`;
    while (skin.has(own)) own += '+';
    skin.set(own, box);
    for (const p of loop) {
      // A piece that is there twice counts twice in the test of a place: the nth one has its own key.
      let key = loose(p);
      while (skin.has(key)) key += '+';
      skin.set(key, boxAround([p]));
    }
  }
  return skin;
}

/** The stretches of a dashed line (distances along it) where its stroke lies on the surface. */
function partsOf(m: Marking, on: (p: Vec) => boolean): [number, number][] {
  const half = MARKING_WIDTH_M / 2;
  const total = loopLength(m.pieces);
  const fits = (s: number) => {
    const p = alongLoop(m.pieces, s);
    if (!p) return false;
    const n = perp({ x: p.tx, y: p.ty });
    return (
      on(p) &&
      on({ x: p.x + n.x * half, y: p.y + n.y * half }) &&
      on({ x: p.x - n.x * half, y: p.y - n.y * half })
    );
  };
  const count = Math.max(2, Math.ceil(total / STEP_M));
  const at = (i: number) => (total * i) / count;
  const parts: [number, number][] = [];
  let open: number | null = null;
  for (let i = 0; i <= count; i++) {
    const ok = fits(at(i));
    if (ok && open === null) open = i === 0 ? 0 : edge(fits, at(i - 1), at(i));
    if (!ok && open !== null) {
      parts.push([open, edge(fits, at(i), at(i - 1))]);
      open = null;
    }
  }
  if (open !== null) parts.push([open, total]);
  return parts.filter(([a, b]) => b - a > 1e-3);
}

/** Where between a place that does not fit (`out`) and one that does (`inn`) the line starts to fit, by halving. */
function edge(fits: (s: number) => boolean, out: number, inn: number): number {
  let [a, b] = [out, inn];
  for (let i = 0; i < REFINE; i++) {
    const m = (a + b) / 2;
    if (fits(m)) b = m;
    else a = m;
  }
  return b;
}

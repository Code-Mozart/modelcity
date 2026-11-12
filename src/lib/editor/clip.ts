import { alongLoop, between, loopLength } from '../curves/along';
import { MARKING_WIDTH_M } from '../curves/lane';
import { insideOf, type Loop } from '../curves/union';
import { perp } from '../curves/vec';
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
export function clipToSurface(lines: Marking[], surface: Loop[]): Marking[] {
  const on = insideOf(surface);
  const half = MARKING_WIDTH_M / 2;
  const clip = (m: Marking): Marking[] => {
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
    return parts
      .filter(([a, b]) => b - a > 1e-3)
      .map(([a, b]) => ({ ...m, pieces: between(m.pieces, a, b) }));
  };
  return lines.flatMap((m) => (m.kind === 'dashed' ? clip(m) : [m]));
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

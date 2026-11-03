import { bendAngleDeg, lengthOf, middleOf } from '../curves/measure';
import type { EdgeRef } from '../curves/path';
import { sweeps } from '../curves/piece';
import type { Arc } from '../curves/types';
import { add, dist, mul, onCircle, sub, unitOr, type Vec } from '../curves/vec';
import { text, toScreen, type Frame, type Palette } from './paint';
import type { RadFocus } from './guides';

const LINE_PX = 13;
/** Where the label of an angle sits from the bend point, towards the arc, in pixels. */
const ANGLE_FROM_BEND_PX = 30;
/** The length label's distance from the middle radius point, towards the center. */
const LENGTH_FROM_RADIUS_PX = 22;
/** Beyond this sweep the tangents hardly meet: the label hangs at the arc instead. */
const MAX_CORNER_SWEEP = 2.6;

/** A label of lines, centered on `at`, the first line on top. */
function label(f: Frame, at: Vec, lines: string[], pal: Palette) {
  const top = at.y - ((lines.length - 1) * LINE_PX) / 2;
  lines.forEach((s, n) =>
    text(
      f.ctx,
      s,
      { x: at.x, y: top + n * LINE_PX + 4 },
      { color: pal['orange-ink'], align: 'center' },
    ),
  );
}

/** The text of a bend: its angle on the first line, its radius on the second (^303). */
const bendLines = (a: Arc) => [`${bendAngleDeg(a).toFixed(0)}°`, `${a.r.toFixed(1)}m`];

/** The bend point of an arc: where the tangents at its ends cross, on the bisector. */
function bendPoint(a: Arc): Vec {
  const mid = onCircle(a.c, a.r, a.a0 + a.da / 2);
  return add(a.c, mul(unitOr(sub(mid, a.c), { x: 1, y: 0 }), a.r / Math.cos(Math.abs(a.da) / 2)));
}

/** Where the label of a bend hangs: inscribed in its angle, a bit from the bend point along the bisector (^303). */
function angleAt(f: Frame, a: Arc, focus: RadFocus | null): Vec {
  const mid = toScreen(f, onCircle(a.c, a.r, a.a0 + a.da / 2));
  if (focus || Math.abs(a.da) > MAX_CORNER_SWEEP) {
    const at = toScreen(f, onCircle(a.c, a.r, a.a0 + a.da * (focus?.t ?? 0.5)));
    const out = unitOr(sub(at, toScreen(f, a.c)), { x: 0, y: -1 });
    return add(at, mul(out, focus && focus.t !== 0.5 ? 34 : 24));
  }
  const corner = toScreen(f, bendPoint(a));
  const reach = Math.min(ANGLE_FROM_BEND_PX, dist(corner, mid) / 2);
  return add(corner, mul(unitOr(sub(mid, corner), { x: 0, y: 1 }), reach));
}

/** The length of a bend, inside the bend at the middle radius point, in the direction the curve leans (^303). */
function lengthOfBend(f: Frame, a: Arc, text_: string, pal: Palette) {
  const mid = toScreen(f, onCircle(a.c, a.r, a.a0 + a.da / 2));
  const inward = unitOr(sub(toScreen(f, a.c), mid), { x: 0, y: 1 });
  label(f, add(mid, mul(inward, LENGTH_FROM_RADIUS_PX)), [text_], pal);
}

/** Elsewhere the length hangs at the middle of the curve, to its left. */
function lengthAtMiddle(f: Frame, pieces: EdgeRef['E']['pieces'], text_: string, pal: Palette) {
  const mid = middleOf(pieces);
  if (!mid) return;
  const [here, ahead] = [toScreen(f, mid), toScreen(f, add(mid, { x: mid.tx, y: mid.ty }))];
  const t = unitOr(sub(ahead, here), { x: 1, y: 0 });
  label(f, add(here, mul({ x: t.y, y: -t.x }, 16)), [text_], pal);
}

/**
 * The measurements of a segment (^303): per bend its angle and radius, inscribed at the bend point;
 * the length of the segment next to the middle radius point of a bend, else at the middle of the
 * curve. While a radius point is hovered or dragged (`focus`) only that arc's label shows, next to it (^128).
 */
export function drawMeasures(
  f: Frame,
  { E }: EdgeRef,
  pal: Palette,
  focus: RadFocus | null = null,
) {
  const arcs = E.pieces.map((p, k) => [p, k] as const).filter(([p]) => sweeps(p));
  for (const [piece, k] of arcs) {
    if (!sweeps(piece) || (focus && focus.k !== k)) continue;
    label(f, angleAt(f, piece, focus), bendLines(piece), pal);
  }
  const length = `${lengthOf(E.pieces).toFixed(1)}m`;
  const only = E.kind === 'C' ? arcs[0]?.[0] : undefined;
  if (only && sweeps(only)) lengthOfBend(f, only, length, pal);
  else lengthAtMiddle(f, E.pieces, length, pal);
}

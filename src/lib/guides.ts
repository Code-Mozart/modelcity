import type { Edge, Tick } from './curves/types';
import type { EdgeRef } from './curves/path';
import { sweeps } from './curves/piece';
import { fromAngle, type Vec } from './curves/vec';
import {
  dot,
  extend,
  ring,
  screenDir,
  segment,
  text,
  toScreen,
  type Frame,
  type Palette,
} from './paint';

/** Construction geometry drawn behind the curve (^9): heading lines, circles, ticks, corner points. */
const HEAD_REACH_PX = 28;
const STUB_PX = 60;
const AXIS_REACH_PX = 50;
const TICK_PX = 9;

/** Where a heading line leads: to a corner point, or as a short stub pointing forward (+1) or back (-1). */
interface HeadEnd {
  corner: Vec | null;
  sign: 1 | -1;
}

function drawTick(f: Frame, t: Tick, pal: Palette) {
  const at = toScreen(f, t.at);
  const d = screenDir(f, t.dir);
  const nx = -d.y * TICK_PX;
  const ny = d.x * TICK_PX;
  segment(
    f.ctx,
    { x: at.x - nx, y: at.y - ny },
    { x: at.x + nx, y: at.y + ny },
    { color: pal[t.role], width: 2 },
  );
}

/** Heading line of one node: through its corner point if there is one, else a short stub. */
function drawHeadingLine(f: Frame, node: Vec & { th: number }, end: HeadEnd, pal: Palette) {
  const { corner, sign } = end;
  const a = toScreen(f, node);
  const stroke = { color: pal.blue, width: 1.6 };
  if (corner) {
    const [from, to] = extend(a, toScreen(f, corner), 0, HEAD_REACH_PX);
    segment(f.ctx, from, to, stroke);
    return;
  }
  const t = screenDir(f, fromAngle(node.th));
  segment(f.ctx, a, { x: a.x + sign * t.x * STUB_PX, y: a.y + sign * t.y * STUB_PX }, stroke);
}

function drawBendGuides(
  f: Frame,
  { p, q, E }: EdgeRef & { E: Extract<Edge, { kind: 'C' }> },
  pal: Palette,
) {
  drawHeadingLine(f, p, { corner: E.C, sign: 1 }, pal);
  drawHeadingLine(f, q, { corner: E.C, sign: 1 }, pal);
}

function drawTwoArcGuides(
  f: Frame,
  { p, q, E }: EdgeRef & { E: Extract<Edge, { kind: 'S' | 'H' }> },
  pal: Palette,
) {
  drawHeadingLine(f, p, { corner: E.k1, sign: 1 }, pal);
  drawHeadingLine(f, q, { corner: E.k2, sign: -1 }, pal);
  const [from, to] = extend(
    toScreen(f, E.axis.a),
    toScreen(f, E.axis.b),
    AXIS_REACH_PX,
    AXIS_REACH_PX,
  );
  segment(f.ctx, from, to, { color: pal.teal, width: 1.6 });
}

export function drawGuides(f: Frame, ref: EdgeRef, pal: Palette) {
  const { E } = ref;
  if (E.kind === 'line') return;
  if (E.kind === 'C') drawBendGuides(f, { ...ref, E }, pal);
  else drawTwoArcGuides(f, { ...ref, E }, pal);
  E.ticks.forEach((t) => drawTick(f, t, pal));
}

export function drawCircles(f: Frame, { E }: EdgeRef, pal: Palette) {
  f.ctx.globalAlpha = 0.7;
  for (const piece of E.pieces) {
    if (sweeps(piece))
      ring(f.ctx, toScreen(f, piece.c), piece.r * f.view.scale, { color: pal.blue, width: 1.5 });
  }
  f.ctx.globalAlpha = 1;
}

/**
 * Derived construction points, part of the scaffold (^51, ^60): the inflection point of an S or
 * hook (blue) and the turquoise corners of an S, which cannot be dragged and are drawn hollow. The
 * handles (the bend's blue point, a hook's turquoise points, the orange rings) are drawn separately.
 */
export function drawCorners(f: Frame, { E }: EdgeRef, pal: Palette) {
  if (E.kind === 'line' || E.kind === 'C') return;
  dot(f.ctx, toScreen(f, E.J), 6, pal.blue);
  if (E.kind !== 'S') return;
  for (const k of [E.k1, E.k2]) {
    if (k) ring(f.ctx, toScreen(f, k), 5.5, { color: pal.teal, width: 2 });
  }
}

/** Radius labels at the middle of each arc. */
export function drawRadiusLabels(f: Frame, { E }: EdgeRef, pal: Palette) {
  for (const piece of E.pieces) {
    if (!sweeps(piece)) continue;
    const mid = toScreen(f, {
      x: piece.c.x + piece.r * Math.cos(piece.a0 + piece.da / 2),
      y: piece.c.y + piece.r * Math.sin(piece.a0 + piece.da / 2),
    });
    const c = toScreen(f, piece.c);
    const l = Math.hypot(mid.x - c.x, mid.y - c.y) || 1;
    const at = { x: mid.x + ((mid.x - c.x) / l) * 22, y: mid.y + ((mid.y - c.y) / l) * 22 };
    text(f.ctx, `${piece.r.toFixed(1)}m`, at, {
      color: pal['orange-ink'],
      size: 12,
      align: 'center',
    });
  }
}

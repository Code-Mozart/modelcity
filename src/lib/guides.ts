import type { Arc, Edge } from './curves/types';
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

/** Construction geometry drawn behind the curve (^9): heading lines, circles, corner points. */
const HEAD_REACH_PX = 28;
const STUB_PX = 60;
const AXIS_REACH_PX = 50;

/** The radius handle that is hovered or dragged on an edge: its arc and the place on it. */
export interface RadFocus {
  k: number;
  t: number;
}

/** Where a heading line leads: to a corner point, or as a short stub pointing forward (+1) or back (-1). */
interface HeadEnd {
  corner: Vec | null;
  sign: 1 | -1;
}

/** Heading line of one node: through its corner point if there is one, else a short stub. */
function drawHeadingLine(f: Frame, node: Vec & { th: number }, end: HeadEnd, pal: Palette) {
  const { corner, sign } = end;
  const a = toScreen(f, node);
  const stroke = { color: pal.orange, width: 1.6 };
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
  segment(f.ctx, from, to, { color: pal.orange, width: 1.6 });
}

export function drawGuides(f: Frame, ref: EdgeRef, pal: Palette) {
  const { E } = ref;
  if (E.kind === 'line') return;
  if (E.kind === 'C') drawBendGuides(f, { ...ref, E }, pal);
  else drawTwoArcGuides(f, { ...ref, E }, pal);
}

export function drawCircles(f: Frame, { E }: EdgeRef, pal: Palette) {
  f.ctx.globalAlpha = 0.7;
  for (const piece of E.pieces) {
    if (sweeps(piece))
      ring(f.ctx, toScreen(f, piece.c), piece.r * f.view.scale, { color: pal.orange, width: 1.5 });
  }
  f.ctx.globalAlpha = 1;
}

/**
 * Derived construction points, part of the scaffold (^51, ^60): the inflection point of an S or
 * hook, and the corners of an S whose middle line is not stored (it is derived and cannot be
 * dragged, so they are hollow). The handles (the bend's point, the corners of a hook or of an S with
 * a middle line, the radius points) are drawn separately.
 */
export function drawCorners(f: Frame, { E }: EdgeRef, pal: Palette) {
  if (E.kind === 'line' || E.kind === 'C') return;
  dot(f.ctx, toScreen(f, E.J), 6, pal.orange);
  if (E.kind !== 'S' || E.mid) return;
  for (const k of [E.k1, E.k2]) {
    if (k) ring(f.ctx, toScreen(f, k), 5.5, { color: pal.orange, width: 2 });
  }
}

/** The place on an arc where its radius label hangs: just outside the circle, at parameter t. */
function labelAt(f: Frame, piece: Arc, t: number): Vec {
  // next to a radius point the label keeps clear of it, in the middle of the arc it hangs closer
  const gap = t === 0.5 ? 22 : 34;
  const a = piece.a0 + piece.da * t;
  const at = toScreen(f, {
    x: piece.c.x + piece.r * Math.cos(a),
    y: piece.c.y + piece.r * Math.sin(a),
  });
  const c = toScreen(f, piece.c);
  const l = Math.hypot(at.x - c.x, at.y - c.y) || 1;
  return { x: at.x + ((at.x - c.x) / l) * gap, y: at.y + ((at.y - c.y) / l) * gap };
}

/**
 * Radius labels at the middle of each arc; while a radius handle is hovered or dragged (`rad`)
 * only the label of its arc is shown, next to that handle (^128).
 */
export function drawRadiusLabels(f: Frame, { E }: EdgeRef, pal: Palette, rad: RadFocus | null) {
  E.pieces.forEach((piece, k) => {
    if (!sweeps(piece) || (rad && rad.k !== k)) return;
    const at = labelAt(f, piece, rad?.t ?? 0.5);
    text(f.ctx, `${piece.r.toFixed(1)}m`, at, { color: pal['orange-ink'], align: 'center' });
  });
}

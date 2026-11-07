import type { Edge } from '../curves/types';
import type { EdgeRef } from '../curves/path';
import { sweeps } from '../curves/piece';
import { fromAngle, type Vec } from '../curves/vec';
import { extend, ring, screenDir, segment, toScreen, type Frame, type Palette } from './paint';

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
function drawHeadingLine(
  f: Frame,
  node: Vec & { th: number },
  end: HeadEnd,
  style: { pal: Palette; dash?: number[] },
) {
  const { pal, dash } = style;
  const { corner, sign } = end;
  const a = toScreen(f, node);
  const stroke = { color: pal.orange, width: 1.6, dash };
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
  style: { pal: Palette; dash?: number[] },
) {
  drawHeadingLine(f, p, { corner: E.C, sign: 1 }, style);
  drawHeadingLine(f, q, { corner: E.C, sign: 1 }, style);
}

function drawTwoArcGuides(
  f: Frame,
  { p, q, E }: EdgeRef & { E: Extract<Edge, { kind: 'S' | 'H' }> },
  style: { pal: Palette; dash?: number[] },
) {
  drawHeadingLine(f, p, { corner: E.k1, sign: 1 }, style);
  drawHeadingLine(f, q, { corner: E.k2, sign: -1 }, style);
  const [from, to] = extend(
    toScreen(f, E.axis.a),
    toScreen(f, E.axis.b),
    AXIS_REACH_PX,
    AXIS_REACH_PX,
  );
  segment(f.ctx, from, to, { color: style.pal.orange, width: 1.6, dash: style.dash });
}

/** The heading lines of a segment (^9); dashed for a preview (^321). */
export function drawGuides(f: Frame, ref: EdgeRef, pal: Palette, dash?: number[]) {
  const { E } = ref;
  if (E.kind === 'line') return;
  if (E.kind === 'C') drawBendGuides(f, { ...ref, E }, { pal, dash });
  else drawTwoArcGuides(f, { ...ref, E }, { pal, dash });
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
 * Derived construction points, part of the scaffold (^51, ^60): the corners of an S or hook (the
 * inflection point is a derived node, a skeleton gizmo, ^823). The handles (the bend's point, the corners of a hook or of an S, the radius points) are
 * drawn separately.
 */
export function drawCorners(f: Frame, { E }: EdgeRef, pal: Palette) {
  if (E.kind === 'line' || E.kind === 'C') return;
  // The corners of an S-curve and of a hook are derived too: rings, not draggable (^105, ^840).
  for (const k of [E.k1, E.k2]) {
    if (k) ring(f.ctx, toScreen(f, k), 5.5, { color: pal.orange, width: 2 });
  }
}

/** The dashed orange line through the interlocked control points of parallel segments, with the other control points on it as rings (^344, ^361). */
export function drawTowerLine(f: Frame, tower: TowerShape, pal: Palette) {
  segment(f.ctx, toScreen(f, tower.p), toScreen(f, tower.q), {
    color: pal.orange,
    width: 2,
    dash: [6, 5],
  });
  for (const at of tower.others) ring(f.ctx, toScreen(f, at), 6.5, { color: pal.orange, width: 2 });
}

/** The line and the other control points on it (^361). */
export interface TowerShape {
  p: Vec;
  q: Vec;
  others: Vec[];
}

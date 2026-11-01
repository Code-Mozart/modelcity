import { TAU, mod, onCircle } from '../curves/vec';
import type { Piece } from '../curves/types';
import { panBy, worldToScreen, type Point, type Size, type View } from './view';

/**
 * The content bounds (^37, ^38, ^62): the tight box around the skeleton, the curves and the node
 * dots (not the control points, which are only shown by need), axis-aligned with the viewbox
 * (screen-aligned, like the grid). The camera may never leave it completely: at least
 * MIN_VISIBLE_PX of it always stay on screen, so the user cannot get lost. The box is never drawn.
 */

/** A node dot, or a piece of a curve; `r` is the extra half size on screen, pixels. */
export type Anchor =
  { kind: 'point'; x: number; y: number; r: number } | { kind: 'piece'; piece: Piece; r: number };

/** The bounds must reach this far into the viewport, pixels. */
export const MIN_VISIBLE_PX = 12;
/** Rounding tolerance for "far enough in", pixels. */
const EPS = 1e-6;

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const boxOf = (pts: Point[], r: number): Box => ({
  minX: Math.min(...pts.map((p) => p.x)) - r,
  maxX: Math.max(...pts.map((p) => p.x)) + r,
  minY: Math.min(...pts.map((p) => p.y)) - r,
  maxY: Math.max(...pts.map((p) => p.y)) + r,
});

/** The screen points that bound a piece: its ends, and for an arc the extremes within its sweep. */
function pieceExtremes(view: View, size: Size, piece: Piece): Point[] {
  const ends = [worldToScreen(view, size, piece.P), worldToScreen(view, size, piece.Q)];
  if (piece.type === 'line') return ends;
  const c = worldToScreen(view, size, piece.c);
  const R = piece.r * view.scale;
  const a0 = piece.a0 + view.rot;
  const extremes = [0, 1, 2, 3]
    .map((k) => (k * Math.PI) / 2)
    .filter((ang) => mod(Math.sign(piece.da) * (ang - a0), TAU) <= Math.abs(piece.da))
    .map((ang) => onCircle(c, R, ang));
  return [...ends, ...extremes];
}

function anchorBox(view: View, size: Size, a: Anchor): Box {
  if (a.kind === 'point') return boxOf([worldToScreen(view, size, a)], a.r);
  return boxOf(pieceExtremes(view, size, a.piece), a.r);
}

/** The tight screen-space box around all anchors, including their own sizes. */
export function screenBox(view: View, size: Size, anchors: Anchor[]): Box {
  const boxes = anchors.map((a) => anchorBox(view, size, a));
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

/** How far the box must move along one axis to reach MIN_VISIBLE_PX into a viewport of `length`. */
function shiftAxis(min: number, max: number, length: number): number {
  if (max < MIN_VISIBLE_PX - EPS) return MIN_VISIBLE_PX - max;
  if (min > length - MIN_VISIBLE_PX + EPS) return length - MIN_VISIBLE_PX - min;
  return 0;
}

/** The screen movement that would bring the bounds back (zero if they are far enough in). */
function shiftToVisible(view: View, size: Size, anchors: Anchor[]): Point {
  const box = screenBox(view, size, anchors);
  return {
    x: shiftAxis(box.minX, box.maxX, size.width),
    y: shiftAxis(box.minY, box.maxY, size.height),
  };
}

export function isVisible(view: View, size: Size, anchors: Anchor[]): boolean {
  const s = shiftToVisible(view, size, anchors);
  return !anchors.length || (s.x === 0 && s.y === 0);
}

/**
 * The view, moved by the least amount that keeps the bounds on screen (^37). With nothing drawn
 * there is nothing to find again, so the view does not pan at all: it stays centered on the
 * origin (zooming and rotating then happen about the center).
 */
export function constrainView(view: View, size: Size, anchors: Anchor[]): View {
  if (!anchors.length) {
    const still = view.cx === 0 && view.cy === 0 && view.gx === 0 && view.gy === 0;
    return still ? view : { ...view, cx: 0, cy: 0, gx: 0, gy: 0 };
  }
  const shift = shiftToVisible(view, size, anchors);
  return shift.x === 0 && shift.y === 0 ? view : panBy(view, shift.x, shift.y);
}

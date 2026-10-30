import { panBy, worldToScreen, type Point, type Size, type View } from './view';

/**
 * The content bounds (^37): an axis-aligned world rectangle around all control points and
 * handles. The camera may never leave it completely, so the user cannot get lost.
 */
export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Margin around the content, screen pixels: also covers the heading-arrow tips (40 px). */
export const BOUNDS_PAD_PX = 48;
/** The viewport must always overlap the bounds by at least this many pixels in every direction. */
export const MIN_VISIBLE_PX = 12;

export function boundsOf(points: Point[]): Rect | null {
  if (!points.length) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/** The bounds with their margin as a polygon in screen pixels (rotated with the view). */
export function screenCorners(view: View, size: Size, r: Rect): Point[] {
  const pad = BOUNDS_PAD_PX / view.scale;
  const corners = [
    { x: r.minX - pad, y: r.minY - pad },
    { x: r.maxX + pad, y: r.minY - pad },
    { x: r.maxX + pad, y: r.maxY + pad },
    { x: r.minX - pad, y: r.maxY + pad },
  ];
  return corners.map((c) => worldToScreen(view, size, c));
}

const project = (pts: Point[], axis: Point): [number, number] => {
  const d = pts.map((p) => p.x * axis.x + p.y * axis.y);
  return [Math.min(...d), Math.max(...d)];
};

/**
 * How far the content must move along `axis` (signed, pixels) so that its projection overlaps
 * the viewport's; 0 if it already does.
 */
function shiftAlong(axis: Point, content: Point[], viewport: Point[]): number {
  const [a0, a1] = project(content, axis);
  const [b0, b1] = project(viewport, axis);
  if (b0 > a1) return b0 - a1;
  if (a0 > b1) return b1 - a0;
  return 0;
}

/** The viewport shrunk by the minimum visible margin: the bounds must reach into it. */
function insetViewport(size: Size): Point[] {
  const m = MIN_VISIBLE_PX;
  return [
    { x: m, y: m },
    { x: size.width - m, y: m },
    { x: size.width - m, y: size.height - m },
    { x: m, y: size.height - m },
  ];
}

/** The separating axis with the largest gap, as the screen movement of the content that fixes it. */
function worstShift(view: View, size: Size, rect: Rect): Point | null {
  const content = screenCorners(view, size, rect);
  const viewport = insetViewport(size);
  const axes: Point[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: Math.cos(view.rot), y: Math.sin(view.rot) },
    { x: -Math.sin(view.rot), y: Math.cos(view.rot) },
  ];
  let best: Point | null = null;
  let bestGap = 1e-6;
  for (const axis of axes) {
    const s = shiftAlong(axis, content, viewport);
    if (Math.abs(s) > bestGap) {
      bestGap = Math.abs(s);
      best = { x: axis.x * s, y: axis.y * s };
    }
  }
  return best;
}

/** True if at least MIN_VISIBLE_PX of the bounds are on screen in every direction. */
export const isVisible = (view: View, size: Size, rect: Rect) =>
  worstShift(view, size, rect) === null;

/**
 * The view, moved by the least amount that keeps the bounds on screen (^37). Without bounds
 * (nothing drawn yet) the view is left alone.
 */
export function constrainView(view: View, size: Size, rect: Rect | null): View {
  if (!rect || size.width <= 2 * MIN_VISIBLE_PX || size.height <= 2 * MIN_VISIBLE_PX) return view;
  let v = view;
  for (let i = 0; i < 4; i++) {
    const shift = worstShift(v, size, rect);
    if (!shift) return v;
    v = panBy(v, shift.x, shift.y);
  }
  return v;
}

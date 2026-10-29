/**
 * View transform for the infinite canvas.
 *
 * World units are meters. World origin (0, 0) is the map center; x points right, y points down
 * (same orientation as the screen). `scale` is pixels per meter; `cx`/`cy` is the world point at
 * the center of the viewport.
 */
export interface View {
  cx: number;
  cy: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Pixels per meter: 0.02 shows ~50 km across 1000 px, 400 shows 2.5 m across 1000 px. */
export const MIN_SCALE = 0.02;
export const MAX_SCALE = 400;
/** The map is 4 x 4 km (±2000 m); the view center may leave it by a margin. */
export const PAN_LIMIT = 2500;

export const initialView = (): View => ({ cx: 0, cy: 0, scale: 100 });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function worldToScreen(view: View, size: Size, p: Point): Point {
  return {
    x: (p.x - view.cx) * view.scale + size.width / 2,
    y: (p.y - view.cy) * view.scale + size.height / 2,
  };
}

export function screenToWorld(view: View, size: Size, p: Point): Point {
  return {
    x: (p.x - size.width / 2) / view.scale + view.cx,
    y: (p.y - size.height / 2) / view.scale + view.cy,
  };
}

export function clampView(view: View): View {
  return {
    cx: clamp(view.cx, -PAN_LIMIT, PAN_LIMIT),
    cy: clamp(view.cy, -PAN_LIMIT, PAN_LIMIT),
    scale: clamp(view.scale, MIN_SCALE, MAX_SCALE),
  };
}

/** Pan by a screen-space delta (the content follows the pointer). */
export function panBy(view: View, dxPx: number, dyPx: number): View {
  return clampView({ ...view, cx: view.cx - dxPx / view.scale, cy: view.cy - dyPx / view.scale });
}

/** Multiply the scale by `factor`, keeping the world point under `anchor` (screen px) fixed. */
export function zoomAt(view: View, size: Size, anchor: Point, factor: number): View {
  const scale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
  const before = screenToWorld(view, size, anchor);
  const moved = { ...view, scale };
  const after = screenToWorld(moved, size, anchor);
  return clampView({ cx: view.cx + before.x - after.x, cy: view.cy + before.y - after.y, scale });
}

/** Smallest "nice" grid step (1, 2, 5 x 10^n meters) that is at least `minPx` wide on screen. */
export function gridStep(scale: number, minPx: number): number {
  const raw = minPx / scale;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * pow >= raw) return m * pow;
  return 10 * pow;
}

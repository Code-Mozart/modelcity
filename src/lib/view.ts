/**
 * View transform for the infinite canvas.
 *
 * World units are meters. World origin (0, 0) is the map center; x points right, y points down
 * (same orientation as the screen). `scale` is pixels per meter; `cx`/`cy` is the world point at
 * the center of the viewport; `rot` rotates the world about that center, in radians, positive =
 * clockwise on screen (rot = 0: world north, -y, points up). The grid does not use `rot` (^30).
 */
export interface View {
  cx: number;
  cy: number;
  scale: number;
  rot: number;
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

export const initialView = (): View => ({ cx: 0, cy: 0, scale: 4, rot: 0 });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** An angle wrapped to (-PI, PI]. */
export const wrapAngle = (a: number) => {
  const w = ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return w === -Math.PI ? Math.PI : w;
};

/** Rotate a vector by `a` radians (clockwise on screen, since y points down). */
export const rotateVec = (p: Point, a: number): Point => ({
  x: p.x * Math.cos(a) - p.y * Math.sin(a),
  y: p.x * Math.sin(a) + p.y * Math.cos(a),
});

export function worldToScreen(view: View, size: Size, p: Point): Point {
  const d = rotateVec({ x: p.x - view.cx, y: p.y - view.cy }, view.rot);
  return { x: d.x * view.scale + size.width / 2, y: d.y * view.scale + size.height / 2 };
}

export function screenToWorld(view: View, size: Size, p: Point): Point {
  const d = rotateVec(
    { x: (p.x - size.width / 2) / view.scale, y: (p.y - size.height / 2) / view.scale },
    -view.rot,
  );
  return { x: d.x + view.cx, y: d.y + view.cy };
}

export function clampView(view: View): View {
  return {
    cx: clamp(view.cx, -PAN_LIMIT, PAN_LIMIT),
    cy: clamp(view.cy, -PAN_LIMIT, PAN_LIMIT),
    scale: clamp(view.scale, MIN_SCALE, MAX_SCALE),
    rot: wrapAngle(view.rot),
  };
}

/** Pan by a screen-space delta (the content follows the pointer). */
export function panBy(view: View, dxPx: number, dyPx: number): View {
  const d = rotateVec({ x: dxPx / view.scale, y: dyPx / view.scale }, -view.rot);
  return clampView({ ...view, cx: view.cx - d.x, cy: view.cy - d.y });
}

/** The same view moved so that world point `world` lands on screen point `screen`. */
export function anchorView(view: View, size: Size, world: Point, screen: Point): View {
  const now = screenToWorld(view, size, screen);
  return clampView({ ...view, cx: view.cx + world.x - now.x, cy: view.cy + world.y - now.y });
}

/** Multiply the scale by `factor`, keeping the world point under `anchor` (screen px) fixed. */
export function zoomAt(view: View, size: Size, anchor: Point, factor: number): View {
  const world = screenToWorld(view, size, anchor);
  const scale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
  return anchorView({ ...view, scale }, size, world, anchor);
}

/** Set the rotation, keeping the world point under `anchor` (screen px) fixed. */
export function rotateAt(view: View, size: Size, anchor: Point, rot: number): View {
  const world = screenToWorld(view, size, anchor);
  return anchorView({ ...view, rot }, size, world, anchor);
}

/** Smallest "nice" grid step (1, 2, 5 x 10^n meters) that is at least `minPx` wide on screen. */
export function gridStep(scale: number, minPx: number): number {
  const raw = minPx / scale;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * pow >= raw) return m * pow;
  return 10 * pow;
}

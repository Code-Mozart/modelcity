import {
  anchorView,
  moveGrid,
  clampView,
  screenToWorld,
  wrapAngle,
  MAX_SCALE,
  MIN_SCALE,
  type Point,
  type Size,
  type View,
} from './view';

/** Two touch points, in screen pixels. */
export type Pair = [Point, Point];

const mid = ([a, b]: Pair): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const span = ([a, b]: Pair) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = ([a, b]: Pair) => Math.atan2(b.y - a.y, b.x - a.x);

/**
 * The view after two fingers moved from `prev` to `next` (^30): pinch zooms, twist rotates, and
 * the midpoint drags; the world point under the old midpoint ends up under the new one.
 */
export function applyTwoFinger(view: View, size: Size, prev: Pair, next: Pair): View {
  const world = screenToWorld(view, size, mid(prev));
  const k = span(prev) > 1e-6 ? span(next) / span(prev) : 1;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * k));
  const rot = view.rot + wrapAngle(angle(next) - angle(prev));
  const g = moveGrid(view, size, { from: mid(prev), to: mid(next) }, scale);
  return clampView(anchorView({ ...view, scale, rot, gx: g.x, gy: g.y }, size, world, mid(next)));
}

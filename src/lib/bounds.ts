import { ARROW_PX } from './curves/handles';
import { fromAngle } from './curves/vec';
import { panBy, rotateVec, worldToScreen, type Point, type Size, type View } from './view';

/**
 * The content bounds (^37, ^38): the tight box around everything the user can grab, axis-aligned
 * with the viewbox (screen-aligned, like the grid). The camera may never leave it completely: at
 * least MIN_VISIBLE_PX of it always stay on screen, so the user cannot get lost. The box is never
 * drawn.
 */

/** A grabbable thing: its world position, its on-screen radius, and for heading handles the angle. */
export interface Anchor {
  x: number;
  y: number;
  /** Half the on-screen size of the handle, pixels. */
  r: number;
  /** Heading handle: its position is the node plus ARROW_PX along this world angle. */
  heading?: number;
}

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

function screenCenter(view: View, size: Size, a: Anchor): Point {
  const at = worldToScreen(view, size, a);
  if (a.heading === undefined) return at;
  const tip = rotateVec(fromAngle(a.heading), view.rot);
  return { x: at.x + tip.x * ARROW_PX, y: at.y + tip.y * ARROW_PX };
}

/** The tight screen-space box around all anchors, including their own sizes. */
export function screenBox(view: View, size: Size, anchors: Anchor[]): Box {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const a of anchors) {
    const c = screenCenter(view, size, a);
    box.minX = Math.min(box.minX, c.x - a.r);
    box.maxX = Math.max(box.maxX, c.x + a.r);
    box.minY = Math.min(box.minY, c.y - a.r);
    box.maxY = Math.max(box.maxY, c.y + a.r);
  }
  return box;
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

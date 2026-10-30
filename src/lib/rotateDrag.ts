import { rotateAt, type Point, type Size, type View } from './view';

/**
 * Rotating the camera with a drag (^30): horizontal movement rotates about the point where the
 * drag started, vertical distance from the start scales the sensitivity (^31).
 */
export interface RotateDrag {
  /** The view before the drag, restored on cancel. */
  view0: View;
  /** Screen point where the drag started; the world point under it stays fixed. */
  anchor: Point;
  last: Point;
  view: View;
}

const DEG_PER_PX = 0.4;
/** Vertical pixels per doubling of the sensitivity. */
const PX_PER_DOUBLING = 150;
const MAX_DOUBLINGS = 4;

export function startRotate(view: View, anchor: Point): RotateDrag {
  return { view0: view, anchor, last: anchor, view };
}

/** Radians per horizontal pixel at vertical offset `dy` (px, down positive) from the start. */
export function sensitivity(dy: number): number {
  const doublings = Math.max(-MAX_DOUBLINGS, Math.min(MAX_DOUBLINGS, -dy / PX_PER_DOUBLING));
  return ((DEG_PER_PX * Math.PI) / 180) * Math.pow(2, doublings);
}

export function moveRotate(drag: RotateDrag, size: Size, to: Point): RotateDrag {
  const dRot = (to.x - drag.last.x) * sensitivity(to.y - drag.anchor.y);
  const view = rotateAt(drag.view, size, drag.anchor, drag.view.rot + dRot);
  return { ...drag, last: to, view };
}

/** Jump to an absolute rotation (N/E/S/W) about the same pivot. */
export function setRotation(drag: RotateDrag, size: Size, rot: number): RotateDrag {
  return { ...drag, view: rotateAt(drag.view, size, drag.anchor, rot) };
}

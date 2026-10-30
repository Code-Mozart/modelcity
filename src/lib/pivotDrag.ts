import { rotateAt, zoomAt, type Point, type Size, type View } from './view';

/**
 * Rotating and zooming the camera with a middle-button drag (^30): horizontal movement rotates,
 * vertical movement zooms, both about the point where the drag started.
 */
export interface PivotDrag {
  /** The view before the drag, restored on cancel. */
  view0: View;
  /** Screen point where the drag started; the world point under it stays fixed. */
  anchor: Point;
  last: Point;
  view: View;
}

/** Radians of rotation per horizontal pixel (0.4 degrees). */
export const RAD_PER_PX = (0.4 * Math.PI) / 180;
/**
 * Zoom per vertical pixel, as an exponent: 1% per pixel near the start like Blender's "Dolly"
 * zoom style (dragging up zooms in), continued exponentially so it never degenerates (^31).
 */
export const ZOOM_PER_PX = 0.01;

export function startPivot(view: View, anchor: Point): PivotDrag {
  return { view0: view, anchor, last: anchor, view };
}

/** Scale the drag would give at pointer height `y`, from the scale at the start of the drag. */
export const scaleAt = (drag: PivotDrag, y: number) =>
  drag.view0.scale * Math.exp((drag.anchor.y - y) * ZOOM_PER_PX);

export function movePivot(drag: PivotDrag, size: Size, to: Point): PivotDrag {
  const rot = drag.view.rot + (to.x - drag.last.x) * RAD_PER_PX;
  const rotated = rotateAt(drag.view, size, drag.anchor, rot);
  const view = zoomAt(rotated, size, drag.anchor, scaleAt(drag, to.y) / rotated.scale);
  return { ...drag, last: to, view };
}

/** Jump to an absolute rotation (N/E/S/W) about the same pivot. */
export function setRotation(drag: PivotDrag, size: Size, rot: number): PivotDrag {
  return { ...drag, view: rotateAt(drag.view, size, drag.anchor, rot) };
}

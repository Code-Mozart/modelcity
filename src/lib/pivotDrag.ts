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
  /** Rotation the horizontal movement is measured from, and the x it is measured from. */
  rotBase: number;
  rotFrom: number;
}

/** Radians of rotation per horizontal pixel (0.4 degrees). */
export const RAD_PER_PX = (0.4 * Math.PI) / 180;
/**
 * Zoom per vertical pixel, as an exponent: 1% per pixel near the start like Blender's "Dolly"
 * zoom style (dragging up zooms in), continued exponentially so it never degenerates (^31).
 */
export const ZOOM_PER_PX = 0.01;

/**
 * Dead zone around the drag start, per axis, pixels: horizontal movement inside it does not
 * rotate and vertical movement inside it does not zoom, so a mostly vertical drag does not also
 * rotate a little and vice versa (^31).
 */
export const DEAD_ZONE_PX = 20;

/** A displacement with the dead zone removed (zero inside it, continuous outside). */
export const beyondDeadZone = (d: number) => Math.sign(d) * Math.max(0, Math.abs(d) - DEAD_ZONE_PX);

export function startPivot(view: View, anchor: Point): PivotDrag {
  return { view0: view, anchor, last: anchor, view, rotBase: view.rot, rotFrom: anchor.x };
}

/** Scale the drag would give at pointer height `y`, from the scale at the start of the drag. */
export const scaleAt = (drag: PivotDrag, y: number) =>
  drag.view0.scale * Math.exp(-beyondDeadZone(y - drag.anchor.y) * ZOOM_PER_PX);

export function movePivot(drag: PivotDrag, size: Size, to: Point): PivotDrag {
  const rot = drag.rotBase + beyondDeadZone(to.x - drag.rotFrom) * RAD_PER_PX;
  const rotated = rotateAt(drag.view, size, drag.anchor, rot);
  const view = zoomAt(rotated, size, drag.anchor, scaleAt(drag, to.y) / rotated.scale);
  return { ...drag, last: to, view };
}

/**
 * Jump to an absolute rotation (N/E/S/W) about the same pivot. Further horizontal movement
 * rotates from there, with the dead zone centered on the current pointer position.
 */
export function setRotation(drag: PivotDrag, size: Size, rot: number): PivotDrag {
  const view = rotateAt(drag.view, size, drag.anchor, rot);
  return { ...drag, view, rotBase: view.rot, rotFrom: drag.last.x };
}

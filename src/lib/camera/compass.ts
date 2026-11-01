import { FONT_PX } from '../render/paint';
import { rotateVec, type Point } from './view';

/** The compass that replaces the cursor while rotating (^30, ^33). */
export interface Cardinal {
  /** Keyboard key and label. */
  key: 'n' | 'e' | 's' | 'w';
  label: 'N' | 'E' | 'S' | 'W';
  /** World direction (unit vector, y down). */
  dir: Point;
  /** View rotation that puts this direction up: N 0, E -90, S 180, W +90 degrees. */
  rot: number;
}

export const CARDINALS: Cardinal[] = [
  { key: 'n', label: 'N', dir: { x: 0, y: -1 }, rot: 0 },
  { key: 'e', label: 'E', dir: { x: 1, y: 0 }, rot: -Math.PI / 2 },
  { key: 's', label: 'S', dir: { x: 0, y: 1 }, rot: Math.PI },
  { key: 'w', label: 'W', dir: { x: -1, y: 0 }, rot: Math.PI / 2 },
];

/** The compass is sized like the icons of the hints: pixel values below are for 12 px text and grow with `FONT_PX` (^83). */
const UI = FONT_PX / 12;

/** Distance of the N/E/S/W key caps (outer ring) from the cursor, pixels. */
const CHIP_RADIUS_PX = 62 * UI;
const CHIP_HIT_PX = 15 * UI;

export const cardinalForKey = (key: string): Cardinal | undefined =>
  CARDINALS.find((c) => c.key === key.toLowerCase());

/** Where a chip sits relative to the cursor: in the on-screen direction of its world direction. */
export function chipOffset(c: Cardinal, viewRot: number): Point {
  const d = rotateVec(c.dir, viewRot);
  return { x: d.x * CHIP_RADIUS_PX, y: d.y * CHIP_RADIUS_PX };
}

/** The chip under `point` when the compass is centered at `center`, if any. */
export function chipAt(center: Point, point: Point, viewRot: number): Cardinal | undefined {
  return CARDINALS.find((c) => {
    const o = chipOffset(c, viewRot);
    return Math.hypot(point.x - center.x - o.x, point.y - center.y - o.y) <= CHIP_HIT_PX;
  });
}

/** What dragging in each screen direction does while the compass is shown (fixed positions, plain icons). */
export interface DragHint {
  id: 'ccw' | 'cw' | 'zoomIn' | 'zoomOut';
  icon: 'ccw' | 'cw' | 'zoomIn' | 'zoomOut';
  label: string;
  dx: number;
  dy: number;
}

/** Distance of the drag-hint icons (inner ring) from the cursor, pixels. */
const HINT_RADIUS_PX = 34 * UI;

export const DRAG_HINTS: DragHint[] = [
  {
    id: 'ccw',
    icon: 'ccw',
    label: 'Drag left: rotate counterclockwise',
    dx: -HINT_RADIUS_PX,
    dy: 0,
  },
  { id: 'cw', icon: 'cw', label: 'Drag right: rotate clockwise', dx: HINT_RADIUS_PX, dy: 0 },
  { id: 'zoomIn', icon: 'zoomIn', label: 'Drag up: zoom in', dx: 0, dy: -HINT_RADIUS_PX },
  { id: 'zoomOut', icon: 'zoomOut', label: 'Drag down: zoom out', dx: 0, dy: HINT_RADIUS_PX },
];

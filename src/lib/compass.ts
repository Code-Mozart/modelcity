import type { Point } from './view';

/** The compass that replaces the cursor while rotating (^30): N, E, S, W key chips around it. */
export interface Cardinal {
  /** Keyboard key and label. */
  key: 'n' | 'e' | 's' | 'w';
  label: 'N' | 'E' | 'S' | 'W';
  /** Offset of the chip from the cursor, pixels (screen up, right, down, left). */
  dx: number;
  dy: number;
  /** View rotation that puts this direction up: N 0, E -90, S 180, W +90 degrees. */
  rot: number;
}

export const COMPASS_RADIUS_PX = 46;
const CHIP_HIT_PX = 16;

export const CARDINALS: Cardinal[] = [
  { key: 'n', label: 'N', dx: 0, dy: -COMPASS_RADIUS_PX, rot: 0 },
  { key: 'e', label: 'E', dx: COMPASS_RADIUS_PX, dy: 0, rot: -Math.PI / 2 },
  { key: 's', label: 'S', dx: 0, dy: COMPASS_RADIUS_PX, rot: Math.PI },
  { key: 'w', label: 'W', dx: -COMPASS_RADIUS_PX, dy: 0, rot: Math.PI / 2 },
];

export const cardinalForKey = (key: string): Cardinal | undefined =>
  CARDINALS.find((c) => c.key === key.toLowerCase());

/** The chip under `point` when the compass is centered at `center`, if any. */
export function chipAt(center: Point, point: Point): Cardinal | undefined {
  return CARDINALS.find(
    (c) => Math.hypot(point.x - center.x - c.dx, point.y - center.y - c.dy) <= CHIP_HIT_PX,
  );
}

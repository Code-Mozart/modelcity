import { toRad } from '../curves/vec';

/**
 * The angle snap (^251): headings snap to multiples of 45°; the farther the pointer is from the
 * point it turns, the finer the step: 15°, then 5°, then 1° (precision grows with distance, ^251).
 * `fromPx` is the distance on the screen from which a step applies; assumed values, tuned by feel.
 */
const ANGLE_TIERS: readonly { fromPx: number; step: number }[] = [
  { fromPx: 0, step: toRad(45) },
  { fromPx: 90, step: toRad(15) },
  { fromPx: 180, step: toRad(5) },
  { fromPx: 320, step: toRad(1) },
];

/** The step that applies at a distance of `px` screen pixels. */
export const angleStepAt = (px: number): number =>
  ANGLE_TIERS.reduce((step, t) => (px >= t.fromPx ? t.step : step), ANGLE_TIERS[0]!.step);

/** The angle (radians) snapped to the step that applies at `px` pixels from the turning point. */
export function snapAngle(th: number, px: number): number {
  const step = angleStepAt(px);
  return Math.round(th / step) * step;
}

import type { Summary } from '../curves/measure';

/** Meters with a decimal (radii); kilometers with two from 1000 m. */
export const preciseText = (m: number): string =>
  m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(1)} m`;

/** A length: whole meters, but kilometers keep their decimals (^342). */
export const lengthText = (m: number): string =>
  m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

/** The bounding box, `2.1 x 3.1 km` or `35 x 12 m` (whole meters, ^342). */
export function boxText({ width, height }: Summary['box']): string {
  const km = Math.max(width, height) >= 1000;
  const f = (m: number) => (km ? (m / 1000).toFixed(1) : String(Math.round(m)));
  return `${f(width)} x ${f(height)} ${km ? 'km' : 'm'}`;
}

/**
 * The curve radius: one value for a single segment or when all four statistics are equal, else
 * minimum, maximum, average and median (^342). Null without bends.
 */
export function radiusText({ radius, segments }: Summary): string | null {
  if (!radius) return null;
  const { min, max, avg, median } = radius;
  const equal = [max, avg, median].every((v) => Math.abs(v - min) < 0.05);
  if (segments === 1 || equal) return `Curve radius: ${preciseText(min)}`;
  return `Curve radius: min ${preciseText(min)}, max ${preciseText(max)}, average ${preciseText(avg)}, median ${preciseText(median)}`;
}

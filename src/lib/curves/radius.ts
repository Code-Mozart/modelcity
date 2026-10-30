/** Smallest radius an edge may be set to, meters. */
export const RMIN = 0.5;
/** Ratio of the largest radius from which an explicit radius snaps back to auto (^8). */
export const AUTO_SNAP = 0.995;

/** Requested radius (null = auto) limited to what fits; never below RMIN unless nothing fits. */
export function limitRadius(requested: number | null, Rmax: number): number {
  const R = requested == null ? Rmax : Math.min(requested, Rmax);
  return Math.max(R, Math.min(Rmax, RMIN));
}

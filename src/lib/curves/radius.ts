import { LANE_WIDTH_M } from './lane';

/**
 * The smallest radius of the centre line of a road of this width (^942): half the width, below that
 * the inside of its hull would turn inside out and a smaller radius only adds fill to the outside
 * (^923). Until lanes have widths of their own (^26) every road is `LANE_WIDTH_M` wide.
 */
export const minRadius = (width: number) => width / 2;

/** Smallest radius an edge may be set to, meters. */
export const RMIN = minRadius(LANE_WIDTH_M);

/** Requested radius (null = auto) limited to what fits; never below RMIN unless nothing fits. */
export function limitRadius(requested: number | null, Rmax: number): number {
  const R = requested == null ? Rmax : Math.min(requested, Rmax);
  return Math.max(R, Math.min(Rmax, RMIN));
}

import { LANE_WIDTH_M } from './lane';

/**
 * The one tolerance for places (^865, ^879): how near (meters) two places, or two distances, must
 * be to count as the same: where a node is "exactly" one lane width from another, whether a node
 * lies on a curve or on the tangent of another node, where two snap points are one place, when
 * nodes merge, how far a derived node must be from a real one, how far two curves may run from
 * one lane width apart. Positions are whole millimeters, so rounding costs up to 0.71 mm per
 * node, 1.41 mm for two: 2 mm covers that (the user: it can be raised up to 100 mm).
 *
 * A new case reuses it. Judge a relation where the points are (the position domain, ^853), not by
 * a number derived from them that magnifies the error: an angle, a radius, a center.
 */
export const SAME_PLACE_M = 2e-3;

/**
 * Whether two headings are the same or exactly opposite, judged in the position domain (^865): a
 * point a lane width away is moved by less than `SAME_PLACE_M` by the difference (about 0.04°).
 */
export const alongOrAgainst = (a: { th: number }, b: { th: number }) =>
  Math.abs(Math.sin(a.th - b.th)) < SAME_PLACE_M / LANE_WIDTH_M;

/** Whether two headings are the same way (not the opposite), in the same sense. */
export const sameWay = (a: { th: number }, b: { th: number }) =>
  alongOrAgainst(a, b) && Math.cos(a.th - b.th) > 0;

/**
 * How near two radii of arcs that sweep `da` must be to count as the same: the position of an
 * arc moves by about its radius change times (1 - cos(da / 2)), so a gentle arc may be off by a
 * lot and still run within `SAME_PLACE_M` (a sweep under 0.1 rad counts as 0.1).
 */
export const radiusTolerance = (da: number) =>
  SAME_PLACE_M / (1 - Math.cos(Math.max(Math.abs(da), 0.1) / 2));

/**
 * How far (meters) a relation may miss and still be shown as a near miss (^884): only for showing,
 * never what decides; 100 mm (assumed, to be judged by the user).
 */
export const NEAR_MISS_M = 0.1;

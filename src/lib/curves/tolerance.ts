/**
 * How near (meters) two places or two distances must be to count as the same: where a node is
 * "exactly" one lane width from another, where the centers of two arcs are one, where two snap
 * points are one place (^247, ^816). Positions are whole millimeters, so rounding costs up to 0.71 mm.
 */
export const SAME_PLACE_M = 1e-3;

/** How near to 1 the dot product of two directions must be for them to be the same or the opposite way (about 0.003°). */
export const SAME_WAY = 1e-9;

/**
 * How near (meters) two radii must be to count as the same, or as a lane width apart: a radius
 * that was snapped to a curve carries the millimeter of the nodes magnified (by 1 / (1 - cos a)
 * for a bend of the angle a), so a millimeter is too fine for it (^860). Assumed, not decided.
 */
export const SAME_RADIUS_M = 1e-2;

/**
 * How near (meters) two places or two distances must be to count as the same: where a node is
 * "exactly" one lane width from another, where the centers of two arcs are one, where two snap
 * points are one place (^247, ^816). Positions are whole millimeters, so rounding costs up to 0.71 mm.
 */
export const SAME_PLACE_M = 1e-3;

/** How near to 1 the dot product of two directions must be for them to be the same or the opposite way (about 0.003°). */
export const SAME_WAY = 1e-9;

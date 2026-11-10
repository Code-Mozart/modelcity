/** The width of a lane, and so of a road for now: 3 m (^90). Lane width as a property comes with ^26. */
export const LANE_WIDTH_M = 3;

/** Width of the outline of a road on each side, screen pixels (^91). */
const OUTLINE_PX = 2;
/** Both outlines together may take at most this share of the road's width... */
const OUTLINE_SHARE = 0.2;

/**
 * The outline width on each side for a road that is `roadPx` wide on screen: 2 px, but scaled down
 * proportionally once both outlines would take more than 20% of the width, which is below
 * 20 px (`LANE_WIDTH_M` x scale), i.e. at less than about 6.7 px per meter (^91).
 */
export const outlinePx = (roadPx: number) => Math.min(OUTLINE_PX, (OUTLINE_SHARE * roadPx) / 2);

/** A dash of a dashed lane marking, and the gap after it (meters): the pattern of the Ortsstraße, the style of all roads for now (^954, ^971, ^973). */
export const DASH_M = 3;
export const DASH_GAP_M = 3;
/** The width of a lane marking (meters), and the least it is drawn with (pixels, ^954). */
export const MARKING_WIDTH_M = 0.15;
export const MARKING_MIN_PX = 1;

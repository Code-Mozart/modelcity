import { headingFrom, placedHeading } from '../snap/heading';
import type { SnapHit } from '../snap/types';
import type { Press } from './types';

/** What the control hints need to know about the snap (^101, ^254, ^301, ^358, ^481). */
export function snapHintState(e: {
  drawing: boolean;
  snapped: SnapHit | null;
  press: Press | null;
}) {
  const heading = placedHeading(e.snapped, false) !== null;
  return {
    snapping: e.snapped !== null,
    /** The snap gives a heading that `Alt` inverts: of a placed node, or the one copied by a dragged control point. */
    touching: heading || (e.press !== null && headingFrom(e.snapped, false) !== null),
    /** A click would place a node at the snap with a heading: only then `Shift` has something to drop. */
    placing: e.drawing && heading,
  };
}

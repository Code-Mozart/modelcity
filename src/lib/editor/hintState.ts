import { headingFrom, headingSources, originNodes, placedHeading } from '../snap/heading';
import { turningNode } from './snapping';
import type { SnapHit } from '../snap/types';
import type { Graph } from '../model/graph';
import { onlyFirstNode } from '../model/junction';
import type { Press } from './types';

/** What the control hints need to know besides what is under the pointer: the snap (^101, ^254, ^301, ^358, ^481) and the road being drawn (^438). */
export function hintStateOf(e: {
  drawing: boolean;
  snapped: SnapHit | null;
  press: Press | null;
  graph: Graph;
  active: number | null;
}) {
  const heading = placedHeading(e.snapped, false) !== null;
  return {
    snapping: e.snapped !== null,
    /** The snap gives a heading that `Alt` inverts: of a placed node, or the one copied by a dragged control point. */
    touching: heading || (e.press !== null && headingFrom(e.snapped, false) !== null),
    /** A click would place a node at the snap with a heading: only then `Shift` has something to drop. */
    placing: e.drawing && heading,
    firstNodeOnly: onlyFirstNode(e),
  };
}

/** The nodes a suggested heading comes from, whose heading arrows are drawn in the snap color (^795). */
export function headingSourceIds(e: { snapped: SnapHit | null; press: Press | null }): number[] {
  return headingSources(e.snapped, turningNode(e.press) !== null);
}

/** The nodes whose points or lines the pointer is snapped to, which get a turquoise ring (^803). */
export const snapOriginIds = (e: { snapped: SnapHit | null }): number[] => originNodes(e.snapped);

import type { Vec } from '../curves/vec';
import { edgesIn, widthOf, type Graph } from '../model/graph';
import type { LaneChange } from './laneChanges';
import type { Sign } from './signs';

/**
 * An arrow painted on a lane (^1029): where, which way the lane runs there, what it shows and how
 * wide the lane is. It is drawn a fixed distance before the place (^1051).
 */
export interface LaneArrow {
  at: Vec;
  th: number;
  sign: Sign;
  width: number;
}

/**
 * The arrows of lanes that end (^1029, ^1059): on the lane that merges, before its start, the
 * last node of the tower where the lane is still whole. Not where nothing leads to that node: an
 * arrow there would stand over the void.
 */
export function laneArrows(d: Graph, changes: LaneChange[]): LaneArrow[] {
  return changes.flatMap((c) => {
    const start = c.from;
    if (c.kind !== 'merge' || !edgesIn(d, start.id).length) return [];
    const sign: Sign = { kind: 'merge', side: c.side };
    return [
      { at: { x: start.x, y: start.y }, th: start.th, sign, width: widthOf(d, c.shifting[0]!) },
    ];
  });
}

import type { Piece } from '../curves/types';
import type { Vec } from '../curves/vec';

/** Which rule made a snap suggestion (^265 to ^273, ^279, ^280): one hat each. */
export type Rule =
  | 'node-normal' // ^265
  | 'node-heading' // ^266
  | 'node-points' // ^267
  | 'curve' // ^268
  | 'bend' // ^269
  | 'radius-point' // ^270
  | 'tick' // ^271
  | 'inflection-point' // ^272
  | 'inflection-lines' // ^273
  | 'offset' // ^279
  | 'crossing' // ^280
  | 'previous' // ^113
  | 'extend+45' // ^325
  | 'extend+15' // ^326
  | 'extend+30' // ^327
  | 'extend-45' // ^328
  | 'extend-15' // ^329
  | 'extend-30' // ^330
  | 'extend+60' // ^337
  | 'extend+75' // ^338
  | 'extend-60' // ^339
  | 'extend-75' // ^340
  | 'own'; // ^336

interface Base {
  rule: Rule;
  /** The nodes that made it, for pinning (^258). */
  from: number[];
}

/** A snap suggestion that leaves no freedom: a place, with the heading a node there would get, if any (^275). */
export interface SnapPoint extends Base {
  kind: 'point';
  at: Vec;
  heading: number | null;
  /** The node that is at this place, to merge into (^248). */
  node?: number;
}

/**
 * A snap suggestion that leaves one degree of freedom along a curve (^263). A snap line is a
 * straight one (a long line piece, undirected). `origins` are the points that made it (^275).
 */
export interface SnapCurve extends Base {
  kind: 'curve';
  pieces: Piece[];
  straight: boolean;
  origins: Vec[];
  /** Offered only near its origins (a line of a node), or anywhere (the curve of a segment). */
  limited: boolean;
  /** The segment it belongs to (the curve and its offsets). */
  edge?: number;
  /** An offset curve: on the right (+1, the lane runs the same way) or the left (-1, the opposite way, ^253). */
  side?: 1 | -1;
  /** The direction of the normal of a snap line: the heading a node placed on it gets (^318). */
  heading?: number;
}

export type Suggestion = SnapPoint | SnapCurve;

/** What a point is pulled to: the new position, the heading there, and what it snapped to (one suggestion, or the two that cross). */
export interface SnapHit {
  pt: Vec;
  heading: number | null;
  by: Suggestion[];
  /**
   * How far of the maximum distance the pointer is from the nodes that made it, 0 to 1 (^294); null
   * if it has none (the curve of a segment, a pinned node, ^258).
   */
  reach?: number | null;
}

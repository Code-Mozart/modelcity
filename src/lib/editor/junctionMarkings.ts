import { alongLoop, loopLength } from '../curves/along';
import type { Vec } from '../curves/vec';
import { edgesIn, edgesOut, widthOf, type GEdge, type Graph } from '../model/graph';
import { anchorsOf, type Anchor } from './anchors';
import { curveOfEdge } from './chains';
import type { EdgeHull } from './corners';
import { lanesIn, type Junction } from './junctions';
import { isShift, manoeuvreOf } from './manoeuvres';
import { paintedSign, signOf, type Sign } from './signs';

/**
 * A line across a lane where traffic waits (^1038): the stop line (Zeichen 294) or the give-way
 * line (Zeichen 341). `at` and `th` are where the lane first meets another segment and the way it
 * runs there (^1051); the line is drawn a fixed distance before it, as wide as the lane.
 */
export interface WaitLine extends Anchor {
  kind: 'stop' | 'give way';
  width: number;
}

/**
 * An arrow painted on a lane (^1028, ^1029): where, which way the lane runs there, what it shows
 * and how wide the lane is. An `anchored` arrow (before a junction) is drawn a fixed distance
 * before the place; the arrow of a lane that ends stands where it is.
 */
export interface LaneArrow extends Anchor {
  sign: Sign;
  width: number;
  anchored: boolean;
}

/** How far before the end of its lane the middle of the arrow of a lane that ends is (meters). */
export const ARROW_BACK_M = 6;

/** The lanes in of the arms of a junction, with where each meets traffic (^1051). */
function lanesWithAnchors(g: Graph, j: Junction, hulls: EdgeHull[]) {
  const anchors = anchorsOf(g, j, hulls);
  return j.arms.map((arm) => ({
    arm,
    lanes: lanesIn(g, j, arm).flatMap(({ node, from }) => {
      const anchor = anchors.get(node.id);
      return anchor ? [{ from, anchor }] : [];
    }),
  }));
}

/** The lines across the lanes in of the arms that wait (^1038), each as wide as its lane. */
export function waitLines(g: Graph, junctions: Junction[], hulls: EdgeHull[]): WaitLine[] {
  return junctions.flatMap((j) =>
    lanesWithAnchors(g, j, hulls).flatMap(({ arm, lanes }) =>
      arm.waits
        ? lanes.map(({ from, anchor }) => ({
            ...anchor,
            kind: arm.waits!,
            width: widthOf(g, from),
          }))
        : [],
    ),
  );
}

/**
 * The arrows before a junction (^1028): where an arm has two lanes in or more, every lane shows its
 * sign (^1012), so that the lane for a way can be chosen; a single lane in shows its sign only if
 * it is not plain straight on. Not painted: *straight, right and left* and the split of a
 * direction that ends in the junction (^1052), `paintedSign`.
 */
function junctionArrows(g: Graph, junctions: Junction[], hulls: EdgeHull[]): LaneArrow[] {
  return junctions.flatMap((j) =>
    lanesWithAnchors(g, j, hulls).flatMap(({ lanes }) =>
      lanes.flatMap(({ from, anchor }) => {
        const sign = paintedSign(g, from);
        const plain = sign?.kind === 'directions' && sign.straight && !sign.left && !sign.right;
        const shown = sign && (lanes.length > 1 || !plain);
        const width = widthOf(g, from);
        return shown ? [{ ...anchor, sign, width, anchored: true }] : [];
      }),
    ),
  );
}

/** An arrow on a segment, `back` meters before its end (at its middle if it is shorter than twice that). */
function arrowOn(g: Graph, e: GEdge, back: number, sign: Sign): LaneArrow[] {
  const pieces = curveOfEdge(g, e.id)?.pieces ?? [];
  const total = loopLength(pieces);
  const at = alongLoop(pieces, total - Math.min(back, total / 2));
  if (!at) return [];
  const [pt, th]: [Vec, number] = [{ x: at.x, y: at.y }, Math.atan2(at.ty, at.tx)];
  return [{ at: pt, th, s: 0, sign, width: widthOf(g, e), anchored: false }];
}

/**
 * The arrows of lanes that end (^1029): on the segment before the shift that merges into the
 * next lane (the lane is still whole there), or on the shift itself if nothing leads to it.
 */
function laneEndArrows(g: Graph): LaneArrow[] {
  return g.edges.flatMap((e) => {
    const sign = signOf(g, e);
    if (sign.kind !== 'merge' || !isShift(manoeuvreOf(g, e)) || edgesIn(g, e.end).length < 2)
      return [];
    const before = edgesIn(g, e.start);
    const lone = before.length === 1 && edgesOut(g, e.start).length === 1;
    return lone ? arrowOn(g, before[0]!, ARROW_BACK_M, sign) : arrowOn(g, e, Infinity, sign);
  });
}

/** All arrows painted on lanes (^1028, ^1029). */
export const laneArrows = (g: Graph, junctions: Junction[], hulls: EdgeHull[]): LaneArrow[] => [
  ...junctionArrows(g, junctions, hulls),
  ...laneEndArrows(g),
];

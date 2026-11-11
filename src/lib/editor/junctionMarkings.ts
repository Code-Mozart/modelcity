import { alongLoop, loopLength } from '../curves/along';
import { add, fromAngle, mul, perp, type Vec } from '../curves/vec';
import { edgesIn, edgesOut, widthOf, type GEdge, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { lanesIn, type Junction } from './junctions';
import { isShift, manoeuvreOf } from './manoeuvres';
import { signOf, type Sign } from './signs';

/** A line across a lane where traffic waits (^1038): the stop line (Zeichen 294) or the give-way line (Zeichen 341). */
export interface WaitLine {
  from: Vec;
  to: Vec;
  kind: 'stop' | 'give way';
}

/** An arrow painted on a lane (^1028, ^1029): where, which way the lane runs there, what it shows and how wide the lane is. */
export interface LaneArrow {
  at: Vec;
  th: number;
  sign: Sign;
  width: number;
}

/** How far before the end of its lane the middle of an arrow is (meters): its own length (5 m) and a little room to the line. */
export const ARROW_BACK_M = 6;

/** The lines across the lanes in of the approaches that wait (^1038), each as wide as its lane. */
export function waitLines(g: Graph, junctions: Junction[]): WaitLine[] {
  return junctions.flatMap((j) =>
    j.approaches.flatMap((approach) =>
      lanesIn(g, j, approach).flatMap(({ node, from }): WaitLine[] => {
        if (!approach.waits) return [];
        const half = mul(perp(fromAngle(node.th)), widthOf(g, from) / 2);
        return [{ from: add(node, half), to: add(node, mul(half, -1)), kind: approach.waits }];
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
  return [{ at: { x: at.x, y: at.y }, th: Math.atan2(at.ty, at.tx), sign, width: widthOf(g, e) }];
}

/**
 * The arrows before a junction (^1028): where an approach has two lanes in or more, every lane
 * shows its sign (^1012), so that the lane for a way can be chosen; a single lane in shows its
 * sign only if it is not plain straight on.
 */
function junctionArrows(g: Graph, junctions: Junction[]): LaneArrow[] {
  return junctions.flatMap((j) =>
    j.approaches.flatMap((approach) => {
      const lanes = lanesIn(g, j, approach);
      return lanes.flatMap(({ from }) => {
        const sign = signOf(g, from);
        const plain = sign.kind === 'directions' && sign.straight && !sign.left && !sign.right;
        const shown = sign.kind === 'directions' && (lanes.length > 1 || !plain);
        return shown ? arrowOn(g, from, ARROW_BACK_M, sign) : [];
      });
    }),
  );
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
export const laneArrows = (g: Graph, junctions: Junction[]): LaneArrow[] => [
  ...junctionArrows(g, junctions),
  ...laneEndArrows(g),
];

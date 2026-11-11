import { edgesIn, nodeOf, widthOf, type Graph } from '../model/graph';
import { anchorsOf, type Anchor } from './anchors';
import type { EdgeHull } from './corners';
import { lanesIn, type Junction } from './junctions';
import { lastOfBranch, paintedSign, signOf, type Sign } from './signs';

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

/**
 * The arrows of lanes that end (^1029): on the segment that merges into the next lane, at its
 * start, the last node of the tower where the lane is still whole, drawn as the arrows before a
 * junction are (^1051).
 */
function laneEndArrows(g: Graph): LaneArrow[] {
  return g.edges.flatMap((e) => {
    const [sign, start] = [signOf(g, e), nodeOf(g, e.start)];
    const merges = sign.kind === 'merge' && lastOfBranch(g, e).id === e.id;
    if (!start || !merges || edgesIn(g, e.end).length < 2) return [];
    return [
      {
        at: { x: start.x, y: start.y },
        th: start.th,
        s: 0,
        sign,
        width: widthOf(g, e),
        anchored: true,
      },
    ];
  });
}

/** All arrows painted on lanes (^1028, ^1029). */
export const laneArrows = (g: Graph, junctions: Junction[], hulls: EdgeHull[]): LaneArrow[] => [
  ...junctionArrows(g, junctions, hulls),
  ...laneEndArrows(g),
];

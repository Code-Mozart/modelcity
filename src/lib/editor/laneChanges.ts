import { between, lengthTo, loopLength } from '../curves/along';
import { offsetPiece } from '../curves/offset';
import { isDegenerate } from '../curves/piece';
import type { Piece } from '../curves/types';
import {
  edgesIn,
  edgesOut,
  nodeOf,
  widthOf,
  type GEdge,
  type GNode,
  type Graph,
} from '../model/graph';
import { curveOfEdge } from './chains';
import { touchPoint } from './derived';
import type { Marking } from './markings';
import { besideSide } from './manoeuvres';

/** The part of the segment `c` between two places along it (meters, `null`: to its end), moved half its width to a side, as a dashed line. */
function lineAlong(
  g: Graph,
  c: GEdge,
  side: 'left' | 'right',
  range: [number, number | null],
): Marking | null {
  const pieces = (curveOfEdge(g, c.id)?.pieces ?? []).filter((p) => !isDegenerate(p));
  const part = between(pieces, range[0], range[1] ?? loopLength(pieces));
  const d = (side === 'right' ? 1 : -1) * (widthOf(g, c) / 2);
  const moved = part.map((p) => offsetPiece(p, d));
  return moved.length && moved.every((p) => p !== null)
    ? { pieces: moved as Piece[], kind: 'dashed' }
    : null;
}

/** How far along `c` (meters) the lane that starts or ends beside it, at `far`, touches it. */
function touchAlong(g: Graph, c: GEdge, far: GNode): number | null {
  const pieces = curveOfEdge(g, c.id)?.pieces;
  const at = pieces && touchPoint(pieces, far);
  return pieces && at ? lengthTo(pieces, at) : null;
}

/** The lane at `n` that is the other of the two, with the far node of the one that lies beside it and on which side. */
function besidePair(g: Graph, n: GNode, legs: GEdge[], at: 'start' | 'end') {
  return legs.flatMap((leg) => {
    const side = besideSide(g, n, leg, legs);
    const far = nodeOf(g, at === 'start' ? leg.end : leg.start);
    return side && far ? legs.filter((c) => c.id !== leg.id).map((c) => ({ c, far, side })) : [];
  });
}

/**
 * The dashed lines through the extensions and merges: where a lane is added beside a lane (a split
 * with two segments of which one ends beside the other), the line between them runs on from where
 * they are parallel back to the node where they part; where a lane ends beside another, from the
 * place where it joins to the node where it merges.
 */
export function laneChangeLines(g: Graph): Marking[] {
  return g.nodes.flatMap((n) => {
    const [outs, ins] = [edgesOut(g, n.id), edgesIn(g, n.id)];
    const added = outs.length === 2 ? besidePair(g, n, outs, 'start') : [];
    const ended = ins.length === 2 ? besidePair(g, n, ins, 'end') : [];
    return [
      ...added.map(({ c, far, side }) => [c, side, [0, touchAlong(g, c, far)]] as const),
      ...ended.map(({ c, far, side }) => [c, side, [touchAlong(g, c, far), null]] as const),
    ].flatMap(([c, side, [from, to]]) => {
      const line = from === null ? null : lineAlong(g, c, side, [from, to]);
      return line ? [line] : [];
    });
  });
}

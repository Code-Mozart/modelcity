import { hullOf } from '../curves/hull';
import { LANE_WIDTH_M } from '../curves/lane';
import { unionOutline, type Loop } from '../curves/union';
import { widthOf, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import type { LaneFacts } from './laneFacts';
import { hullPieces } from './surface';

/** How far the debug hull of a lane reaches beyond the segments, on each side (meters): half a lane. */
const HULL_PADDING_M = LANE_WIDTH_M / 2;

/**
 * The outline round what a lane in meets (^1102): its own segments and the segments of the lanes it
 * meets, each with some padding, for the debug layer. Judged per node (^1101), so it shows where
 * *this* lane has to look, not a junction.
 */
export function laneHull(g: Graph, f: LaneFacts): Loop[] {
  const edges = new Set([...f.edges, ...f.conflicts.flatMap((c) => [c.mine, c.theirs])]);
  const hulls = [...edges].flatMap((e) => {
    const pieces = curveOfEdge(g, e.id)?.pieces;
    const hull = pieces && hullOf(pieces, widthOf(g, e) + 2 * HULL_PADDING_M);
    return hull ? [hullPieces(hull)] : [];
  });
  // Flat ends that lie on each other leave a stray piece: not a loop.
  return unionOutline(hulls).filter((l) => l.length > 1);
}

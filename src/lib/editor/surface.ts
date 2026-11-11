import { alongLoop } from '../curves/along';
import type { Hull } from '../curves/hull';
import type { Piece } from '../curves/types';
import { loopArea } from '../curves/area';
import { LANE_WIDTH_M } from '../curves/lane';
import { pointOn } from '../curves/piece';
import { insideLoops, unionOutline, type Loop } from '../curves/union';
import type { Vec } from '../curves/vec';
import type { Graph } from '../model/graph';
import { hullsOf, type EdgeHull } from './corners';

/** The pieces of the outline of a hull, in no particular order (^945). */
export const hullPieces = (h: Hull): Piece[] => [...h.sides[0], ...h.sides[1], ...h.caps];

/** The road surface (^945): the outline of the union of the hulls of all segments, as closed loops of pieces. */
export const surfaceFrom = (hulls: EdgeHull[]): Loop[] =>
  unionOutline(hulls.map((h) => hullPieces(h.hull)));

export const surfaceOf = (g: Graph): Loop[] => surfaceFrom(hullsOf(g));

/** One dot per polygon of the surface, `walk` meters along its skin (^948). */
export const dotsOf = (loops: Loop[], walk: number): Vec[] =>
  loops.flatMap((l) => alongLoop(l, walk) ?? []);

/** The holes of the surface (^1033): the loops that lie inside an odd number of other loops, land enclosed by road. */
export function holesOf(loops: Loop[]): Loop[] {
  return loops.filter((loop) => {
    const at = pointOn(loop[0]!, 0.5);
    return loops.filter((o) => o !== loop && insideLoops([o], at)).length % 2 === 1;
  });
}

/** A hole smaller than a square of one lane width is patched (^1033): no new number, the lane is the measure. */
const TINY_HOLE_M2 = LANE_WIDTH_M * LANE_WIDTH_M;

/** The surface without its tiny holes (^1033): they are road. Larger holes stay land, islands. */
export function patched(loops: Loop[]): Loop[] {
  const tiny = new Set(holesOf(loops).filter((h) => loopArea(h) < TINY_HOLE_M2));
  return loops.filter((l) => !tiny.has(l));
}

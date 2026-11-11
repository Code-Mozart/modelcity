import { alongLoop } from '../curves/along';
import type { Hull } from '../curves/hull';
import type { Piece } from '../curves/types';
import { inscribedRadius } from '../curves/area';
import { LANE_WIDTH_M } from '../curves/lane';
import { pointOn } from '../curves/piece';
import { insideLoops, unionOutline, type Loop } from '../curves/union';
import type { Vec } from '../curves/vec';
import type { Graph } from '../model/graph';
import { hullsOf, type EdgeHull } from './corners';

/** The pieces of the outline of a hull, in no particular order (^945). */
export const hullPieces = (h: Hull): Piece[] => [...h.sides[0], ...h.sides[1], ...h.caps];

/** The road surface (^945): the outline of the union of the hulls of all segments and of the `extra` loops (the wedges, ^1065), as closed loops of pieces. */
export const surfaceFrom = (hulls: EdgeHull[], extra: Loop[] = []): Loop[] =>
  unionOutline([...hulls.map((h) => hullPieces(h.hull)), ...extra]);

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

/** A hole that a circle of half a lane width (1.5 m across: less than a lane) does not fit in is patched (^1054): thin and long ones too. The lane is the measure, no new number. */
const PATCH_RADIUS_M = LANE_WIDTH_M / 4;

/** The surface without its narrow holes (^1054): they are road. Wider holes stay land, islands. */
export function patched(loops: Loop[]): Loop[] {
  const narrow = new Set(holesOf(loops).filter((h) => inscribedRadius(h) < PATCH_RADIUS_M));
  return loops.filter((l) => !narrow.has(l));
}

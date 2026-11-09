import { alongLoop } from '../curves/along';
import type { Hull } from '../curves/hull';
import type { Piece } from '../curves/types';
import { unionOutline, type Loop } from '../curves/union';
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

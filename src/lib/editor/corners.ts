import { boxAround, boxesMeet, hullOf, type Box, type Hull } from '../curves/hull';
import { pointOn, nearestParam } from '../curves/piece';
import { alongOrAgainst } from '../curves/tolerance';
import type { Piece } from '../curves/types';
import { angleOf, type Vec } from '../curves/vec';
import { widthOf, type Graph } from '../model/graph';
import { crossPieces } from '../snap/geometry';
import { curveOfEdge } from './chains';

/** The hull of a segment, with the segment (^923). */
export interface EdgeHull {
  edge: number;
  hull: Hull;
  box: Box;
}

/** A corner (^924): where the sides of the hulls of two segments cross, with the two segments. */
export interface Corner {
  at: Vec;
  a: number;
  b: number;
}

/** The hulls of all segments, at the width of their lane configurations (^26). */
export function hullsOf(g: Graph): EdgeHull[] {
  return g.edges.flatMap((e) => {
    const pieces = curveOfEdge(g, e.id)?.pieces;
    const hull = pieces && hullOf(pieces, widthOf(g, e));
    return hull ? [{ edge: e.id, hull, box: boxAround([...hull.sides[0], ...hull.sides[1]]) }] : [];
  });
}

const headingAt = (piece: Piece, at: Vec) => {
  const s = pointOn(piece, nearestParam(piece, at));
  return { th: angleOf({ x: s.tx, y: s.ty }) };
};

/**
 * The places where a side piece crosses another: not where the two only touch or run on, that is
 * where they have the same direction or the opposite one there (the sides of segments that meet at
 * a node, or that run side by side, ^100), judged in the position domain (^865).
 */
const crossAcross = (p: Piece, q: Piece): Vec[] =>
  crossPieces(p, q).filter((at) => !alongOrAgainst(headingAt(p, at), headingAt(q, at)));

/** The places where one curve (side) crosses another. */
const crossSides = (sa: Piece[], sb: Piece[]): Vec[] =>
  sa.flatMap((p) => sb.flatMap((q) => crossAcross(p, q)));

/** The corners where the sides of one hull cross the sides of another. */
function cornersBetween(a: EdgeHull, b: EdgeHull): Corner[] {
  const found: Vec[] = [];
  for (const sa of a.hull.sides) for (const sb of b.hull.sides) found.push(...crossSides(sa, sb));
  return found.map((at) => ({ at, a: a.edge, b: b.edge }));
}

/**
 * The corners of all crossings (^924): the sides of the hulls of two segments cross where the
 * segments cross, in four places for each crossing, and at a node where more than two segments
 * meet, where the hulls of the branches part (^921). Hulls that only touch or run side by side
 * have none. Segments are compared when their boxes meet.
 */
export function cornersOf(hulls: EdgeHull[]): Corner[] {
  return hulls.flatMap((a, i) =>
    hulls
      .slice(i + 1)
      .filter((b) => boxesMeet(a.box, b.box))
      .flatMap((b) => cornersBetween(a, b)),
  );
}

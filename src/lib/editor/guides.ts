import { alongLoop, loopLength } from '../curves/along';
import { offsetPiece } from '../curves/offset';
import { isDegenerate } from '../curves/piece';
import type { Piece } from '../curves/types';
import { dot, perp, sub } from '../curves/vec';
import { widthOf, type GEdge, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import type { Junction } from './junctions';
import type { Marking } from './markings';
import { manoeuvreOf } from './manoeuvres';
import { parallel } from './parallel';

/** The curve of a segment without its pieces that have no length. */
const real = (g: Graph, e: GEdge): Piece[] =>
  (curveOfEdge(g, e.id)?.pieces ?? []).filter((p) => !isDegenerate(p));

/** The middle of a segment, with the way it runs there. */
function middleOf(g: Graph, e: GEdge) {
  const pieces = real(g, e);
  return alongLoop(pieces, loopLength(pieces) / 2);
}

/** Which sides of the segment `e` have a segment of the junction beside them that is parallel to it (^1048). */
function neighbours(g: Graph, e: GEdge, inside: GEdge[]): { left: boolean; right: boolean } {
  const mine = middleOf(g, e);
  const found = { left: false, right: false };
  if (!mine) return found;
  const across = perp({ x: mine.tx, y: mine.ty });
  for (const o of inside.filter((o) => o.id !== e.id && parallel(g, e, o))) {
    const theirs = middleOf(g, o);
    if (theirs && dot(sub(theirs, mine), across) > 0) found.right = true;
    else if (theirs) found.left = true;
  }
  return found;
}

/** The line along a side of a segment, half its width off its centerline: the right side or the left one. */
function edgeLine(g: Graph, e: GEdge, side: 'left' | 'right'): Marking | null {
  const d = (side === 'right' ? 1 : -1) * (widthOf(g, e) / 2);
  const moved = real(g, e).map((p) => offsetPiece(p, d));
  return moved.length && moved.every((p) => p !== null)
    ? { pieces: moved as Piece[], kind: 'dashed' }
    : null;
}

/** The segments of the major direction that go on through the junction between two of its arms (^1048). */
function throughSegments(g: Graph, j: Junction, inside: GEdge[]): GEdge[] {
  const armOf = (id: number, lane: 'ins' | 'outs') =>
    j.arms.find((a) => a[lane].some((n) => n.id === id));
  return inside.filter((e) => {
    const [from, to] = [armOf(e.start, 'ins'), armOf(e.end, 'outs')];
    return from?.role === 'major' && to?.role === 'major' && from.direction === to.direction;
  });
}

/** The arms from which a junction counts as one of four ways or more, where left turns get guide lines (^1049). */
const MANY_ARMS = 4;

/**
 * The dashed lines that guide the traffic through a junction, besides the centerlines between
 * parallel lanes (^950, ^1050): along the sides of the segments of the major direction that go
 * straight on, where nothing runs beside them (^1048); along the left side of the left turns of a
 * junction of four ways or more, where nothing runs beside them (^1049).
 */
export function guideLines(g: Graph, junctions: Junction[]): Marking[] {
  return junctions.flatMap((j) => {
    const inside = g.edges.filter((e) => j.segments.includes(e.id));
    const through = j.control === 'priority' ? throughSegments(g, j, inside) : [];
    const lefts =
      j.arms.length >= MANY_ARMS ? inside.filter((e) => manoeuvreOf(g, e) === 'left turn') : [];
    // Beside a segment is another of its kind (the lanes of the major direction, the left turns), not whatever runs along it.
    const sides = (e: GEdge, among: GEdge[], wanted: ('left' | 'right')[]) => {
      const beside = neighbours(g, e, among);
      return wanted.filter((s) => !beside[s]).map((s) => edgeLine(g, e, s));
    };
    const lines = [
      ...through.flatMap((e) => sides(e, through, ['left', 'right'])),
      ...lefts.flatMap((e) => sides(e, lefts, ['left'])),
    ];
    return lines.filter((l) => l !== null);
  });
}

import { crossPieces } from '../snap/geometry';
import { boxAround, boxesMeet, type Box } from './hull';
import { distanceToPiece, nearestParam, pieceLength, pointOn, reversePiece } from './piece';
import { SAME_PLACE_M } from './tolerance';
import type { Piece } from './types';
import { add, dist, mul, perp, type Vec } from './vec';

/**
 * The outline of the union of curvilinear polygons (^945): the road surface is the area covered by
 * the hulls of all segments (^923); its boundary is what is drawn. Each region is given as the
 * bag of the pieces of its outline, in any order and direction.
 *
 * The pieces of all outlines are cut where they cross and where another piece ends on them. A cut
 * piece is a boundary of the union where one side of it is inside some region and the other is not:
 * the caps between segments, the sides of lanes side by side and everything else inside another
 * hull are in the union on both sides and go. What is left is chained into closed loops, to be
 * filled with the even-odd rule: a loop inside another is a hole.
 */
export type Loop = Piece[];

/** How far from a piece the two sides are looked at: more than the tolerance, so that sides that coincide within it count as one (^865). */
const PROBE_M = 2 * SAME_PLACE_M;
/** Pieces and cut parameters closer than this are one (meters). */
const TINY_M = 1e-4;
/** A ray that no vertex of a drawing is likely to lie on. */
const RAY_SLOPE = 0.000123;
const RAY_REACH_M = 1e5;

interface Region {
  pieces: Piece[];
  box: Box;
}

/** The part of a piece between two parameters. */
function subPiece(p: Piece, t0: number, t1: number): Piece {
  const [a, b] = [pointOn(p, t0), pointOn(p, t1)];
  const [P, Q] = [
    { x: a.x, y: a.y },
    { x: b.x, y: b.y },
  ];
  if (p.type === 'line') return { type: 'line', P, Q };
  return { ...p, P, Q, a0: p.a0 + p.da * t0, da: p.da * (t1 - t0) };
}

/** The parameters at which a piece is cut by the other pieces: crossings, and ends of others that lie on it. */
function cutsOf(piece: Piece, others: Piece[]): number[] {
  const ts = [0, 1];
  for (const q of others) {
    for (const x of crossPieces(piece, q)) ts.push(nearestParam(piece, x));
    for (const e of [q.P, q.Q])
      if (distanceToPiece(piece, e) < SAME_PLACE_M) ts.push(nearestParam(piece, e));
  }
  const length = pieceLength(piece);
  const sorted = ts.sort((a, b) => a - b);
  return sorted.filter((t, i) => i === 0 || (t - sorted[i - 1]!) * length > TINY_M);
}

/** All the pieces cut at each other, those with no length left out. */
function cutAll(pieces: Piece[]): Piece[] {
  const boxes = pieces.map((p) => boxAround([p]));
  return pieces.flatMap((p, i) => {
    const near = pieces.filter((_, j) => j !== i && boxesMeet(boxes[i]!, boxes[j]!));
    const ts = cutsOf(p, near);
    return ts
      .slice(1)
      .map((t, k) => subPiece(p, ts[k]!, t))
      .filter((s) => pieceLength(s) > TINY_M);
  });
}

/** Whether a point is inside a region: an odd number of crossings of a ray with its outline (even-odd). */
function inside(r: Region, p: Vec): boolean {
  const b = r.box;
  if (p.x < b.x0 || p.x > b.x1 || p.y < b.y0 || p.y > b.y1) return false;
  const ray: Piece = {
    type: 'line',
    P: p,
    Q: { x: p.x + RAY_REACH_M, y: p.y + RAY_REACH_M * RAY_SLOPE },
  };
  return r.pieces.reduce((n, q) => n + crossPieces(ray, q).length, 0) % 2 === 1;
}

/** The unit normal of a piece at its middle. */
function normalAtMiddle(p: Piece): Vec {
  const m = pointOn(p, 0.5);
  return p.type === 'line'
    ? perp({ x: m.tx, y: m.ty })
    : { x: (m.x - p.c.x) / p.r, y: (m.y - p.c.y) / p.r };
}

/** Whether a cut piece is on the boundary of the union: inside on one side, not on the other. */
function onBoundary(p: Piece, regions: Region[]): boolean {
  const [m, n] = [pointOn(p, 0.5), normalAtMiddle(p)];
  const probe = (side: 1 | -1) => add(m, mul(n, side * PROBE_M));
  const covered = (pt: Vec) => regions.some((r) => inside(r, pt));
  return covered(probe(1)) !== covered(probe(-1));
}

/** Whether two pieces are the same curve, in either direction. */
function same(a: Piece, b: Piece): boolean {
  const [ma, mb] = [pointOn(a, 0.5), pointOn(b, 0.5)];
  const ends =
    (dist(a.P, b.P) < SAME_PLACE_M && dist(a.Q, b.Q) < SAME_PLACE_M) ||
    (dist(a.P, b.Q) < SAME_PLACE_M && dist(a.Q, b.P) < SAME_PLACE_M);
  return ends && dist(ma, mb) < SAME_PLACE_M;
}

/**
 * Takes out of `rest` the piece that goes on from `at`: the one with an end nearest to it, within
 * reach, turned round if it is its far end. None when the loop is back at its `start` (or nothing
 * is in reach). The nearest end is asked for, not a numbered place: ends that are the same place
 * within the tolerance do not always fall into the same group of three or more (^1002).
 */
function takeNext(rest: Piece[], at: Vec, start: Vec): Piece | null {
  let [best, reach, turned] = [-1, PROBE_M, false];
  rest.forEach((p, j) => {
    const [dP, dQ] = [dist(p.P, at), dist(p.Q, at)];
    if (Math.min(dP, dQ) >= reach) return;
    [best, reach, turned] = [j, Math.min(dP, dQ), dQ < dP];
  });
  if (best < 0 || dist(start, at) <= reach) return null;
  const [piece] = rest.splice(best, 1);
  return turned ? reversePiece(piece!) : piece!;
}

/**
 * The pieces chained into closed loops: each one starts where the one before ends. A piece shorter
 * than the tolerance is no edge of the outline: its two ends are one place (^1002).
 */
function chain(pieces: Piece[]): Loop[] {
  const rest = pieces.filter((p) => pieceLength(p) >= SAME_PLACE_M);
  const loops: Loop[] = [];
  for (let first = rest.shift(); first; first = rest.shift()) {
    const loop: Loop = [first];
    for (
      let next = takeNext(rest, first.Q, first.P);
      next;
      next = takeNext(rest, next.Q, first.P)
    ) {
      loop.push(next);
    }
    loops.push(loop);
  }
  return loops;
}

/** The outline of the union of the regions, as closed loops of pieces (^945). */
export function unionOutline(regions: Piece[][]): Loop[] {
  const all = regions.map((pieces): Region => ({ pieces, box: boxAround(pieces) }));
  const cut = cutAll(regions.flat().filter((p) => pieceLength(p) > TINY_M));
  const boundary = cut.filter((p) => onBoundary(p, all));
  const distinct = boundary.filter((p, i) => !boundary.slice(0, i).some((q) => same(p, q)));
  return chain(distinct);
}

/** A test for points being inside the loops (even-odd, so inside a hole is outside), for many points. */
export function insideOf(loops: Loop[]): (p: Vec) => boolean {
  const pieces = loops.flat();
  const region = { pieces, box: boxAround(pieces) };
  return (p) => inside(region, p);
}

/** Whether a point is inside the loops (even-odd, so inside a hole is outside). */
export const insideLoops = (loops: Loop[], p: Vec): boolean => insideOf(loops)(p);

import { crossPieces } from '../snap/geometry';
import { boxAround, boxesMeet, type Box } from './hull';
import { Grid } from './grid';
import { Memo, pieceKey } from './memo';
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
export const RAY_SLOPE = 0.000123;
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

/** The size of a cell of the grids of the pieces of the outlines (meters): a lane width and a bit. */
const PIECE_CELL_M = 4;

/** What was found the last time (^941): the cuts of each piece and whether each cut piece is on the boundary. */
export class UnionMemory {
  cuts = new Memo<Piece[]>();
  sides = new Memo<boolean>();
}

/** The pieces of a list with their keys and boxes, keyed (the same piece twice is one key). */
function keyed(pieces: Piece[]) {
  const keys = pieces.map(pieceKey);
  const boxes = pieces.map((p) => boxAround([p]));
  const now = new Map<string, Box>();
  keys.forEach((k, i) => now.set(k, boxes[i]!));
  return { keys, boxes, now };
}

/** All the pieces cut at each other, those with no length left out. */
function cutAll(pieces: Piece[], memo?: Memo<Piece[]>): Piece[] {
  const { keys, boxes, now } = keyed(pieces);
  const grid = new Grid<number>(PIECE_CELL_M);
  boxes.forEach((b, i) => grid.add(i, b));
  memo?.begin(now);
  const cut = (p: Piece, i: number): Piece[] => {
    const nearby = [...grid.near(boxes[i]!)].filter(
      (j) => j !== i && boxesMeet(boxes[i]!, boxes[j]!),
    );
    const ts = cutsOf(
      p,
      nearby.sort((a, b) => a - b).map((j) => pieces[j]!),
    );
    return ts
      .slice(1)
      .map((t, k) => subPiece(p, ts[k]!, t))
      .filter((s) => pieceLength(s) > TINY_M);
  };
  return pieces.flatMap((p, i) =>
    memo ? memo.get(keys[i]!, boxes[i]!, () => cut(p, i)) : cut(p, i),
  );
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
function onBoundary(p: Piece, regions: Grid<Region>): boolean {
  const [m, n] = [pointOn(p, 0.5), normalAtMiddle(p)];
  const probe = (side: 1 | -1) => add(m, mul(n, side * PROBE_M));
  const covered = (pt: Vec) =>
    [...regions.near({ x0: pt.x, x1: pt.x, y0: pt.y, y1: pt.y })].some((r) => inside(r, pt));
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

/** A grid of the places where pieces end, to find the one that goes on from a place (^938). */
function endsGrid(pieces: Piece[]): Grid<number> {
  const grid = new Grid<number>(PIECE_CELL_M);
  pieces.forEach((p, i) => {
    for (const e of [p.P, p.Q]) grid.add(i, { x0: e.x, x1: e.x, y0: e.y, y1: e.y });
  });
  return grid;
}

/**
 * The index in `pieces` of the piece, not yet `taken`, that goes on from `at`: the one with an end
 * nearest to it (the first of them if there are several), within reach. None (-1) when nothing is
 * in reach. The nearest end is asked for, not a numbered place: ends that are the same place
 * within the tolerance do not always fall into the same group of three or more (^1002).
 */
function takeNext(pieces: Piece[], ends: Grid<number>, taken: boolean[], at: Vec): number {
  let [best, reach] = [-1, PROBE_M];
  const box = { x0: at.x - PROBE_M, x1: at.x + PROBE_M, y0: at.y - PROBE_M, y1: at.y + PROBE_M };
  for (const j of ends.near(box)) {
    if (taken[j]) continue;
    const d = Math.min(dist(pieces[j]!.P, at), dist(pieces[j]!.Q, at));
    if (d < reach || (d === reach && best >= 0 && j < best)) [best, reach] = [j, d];
  }
  return best;
}

/**
 * The pieces chained into closed loops: each one starts where the one before ends. A piece shorter
 * than the tolerance is no edge of the outline: its two ends are one place (^1002).
 */
function chain(all: Piece[]): Loop[] {
  const pieces = all.filter((p) => pieceLength(p) >= SAME_PLACE_M);
  const [ends, taken] = [endsGrid(pieces), pieces.map(() => false)];
  const loops: Loop[] = [];
  for (let i = 0; i < pieces.length; i++) {
    if (taken[i]) continue;
    taken[i] = true;
    const first = pieces[i]!;
    const loop: Loop = [first];
    for (
      let at = first.Q, j = takeNext(pieces, ends, taken, at);
      j >= 0;
      j = takeNext(pieces, ends, taken, at)
    ) {
      taken[j] = true;
      const piece = pieces[j]!;
      const turned = dist(piece.Q, at) < dist(piece.P, at);
      loop.push(turned ? reversePiece(piece) : piece);
      at = turned ? piece.P : piece.Q;
    }
    loops.push(loop);
  }
  return loops;
}

/** A box grown by the probe distance on every side. */
const grown = (b: Box): Box => ({
  x0: b.x0 - PROBE_M,
  x1: b.x1 + PROBE_M,
  y0: b.y0 - PROBE_M,
  y1: b.y1 + PROBE_M,
});

/** Whether every place of a piece is within the probe distance of one of the pieces `by`. */
const coveredBy = (p: Piece, by: Piece[]) =>
  [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].every((t) => {
    const at = pointOn(p, t);
    return by.some((q) => distanceToPiece(q, at) < PROBE_M);
  });

/**
 * Boundary pieces that are covered by the others are left out, the longest first: a short straight
 * piece on a nearly straight big arc is a copy of a part of it, a long one on two short ones the
 * same the other way round. At a joint the chain could take such a piece for the way on and run
 * into a dead end (the outline of a road in two loops, closed by a stray line).
 */
function withoutCovered(pieces: Piece[]): Piece[] {
  const boxes = new Map(pieces.map((p) => [p, boxAround([p])]));
  const grid = new Grid<Piece>(PIECE_CELL_M);
  boxes.forEach((b, p) => grid.add(p, b));
  const kept = new Set(pieces);
  const longest = [...pieces].sort((a, b) => pieceLength(b) - pieceLength(a));
  for (const p of longest) {
    // Short pieces are within the probe distance of their neighbours, and not copies of anything.
    if (pieceLength(p) < 4 * PROBE_M) continue;
    const box = boxes.get(p)!;
    const near = [...grid.near(grown(box))].filter(
      (q) => q !== p && kept.has(q) && boxesMeet(grown(box), boxes.get(q)!),
    );
    if (near.length && coveredBy(p, near)) kept.delete(p);
  }
  return pieces.filter((p) => kept.has(p));
}

/** The pieces without the ones that are the same curve as an earlier one (^938: only those near its middle are compared). */
function distinctPieces(boundary: Piece[]): Piece[] {
  const grid = new Grid<Piece>(PIECE_CELL_M);
  return boundary.filter((p) => {
    const m = pointOn(p, 0.5);
    const box = {
      x0: m.x - SAME_PLACE_M,
      x1: m.x + SAME_PLACE_M,
      y0: m.y - SAME_PLACE_M,
      y1: m.y + SAME_PLACE_M,
    };
    const twin = [...grid.near(box)].some((q) => same(p, q));
    grid.add(p, box);
    return !twin;
  });
}

/** The outline of the union of the regions, as closed loops of pieces (^945). */
export function unionOutline(regions: Piece[][], memory?: UnionMemory): Loop[] {
  const all = new Grid<Region>(PIECE_CELL_M);
  const places = new Map<string, Box>();
  for (const pieces of regions) {
    const box = boxAround(pieces);
    all.add({ pieces, box }, box);
    places.set(pieces.map(pieceKey).join('|'), box);
  }
  memory?.sides.begin(places);
  const cut = cutAll(
    regions.flat().filter((p) => pieceLength(p) > TINY_M),
    memory?.cuts,
  );
  const boundary = cut.filter((p) =>
    memory
      ? memory.sides.get(pieceKey(p), grown(boxAround([p])), () => onBoundary(p, all))
      : onBoundary(p, all),
  );
  return chain(withoutCovered(distinctPieces(boundary)));
}

/** The size of a cell of the grid of the pieces of the loops (meters): about the size of a lane junction. */
const CELL_M = 50;
/** The height of a cell of that grid (meters): the ray of a point runs almost along x, so a thin row holds only the pieces it can meet (^941). */
const ROW_M = 1;

/** The boxes of loops that hold the point, and how far to the right they reach. A loop whose box does not hold the point crosses the ray an even number of times and does not count; the boxes that hold it decide how far the ray needs to go. */
function holding(boxes: Grid<Box>, p: Vec): { held: Set<Box>; reach: number } {
  const held = new Set<Box>();
  let reach = p.x;
  // A point on the skin of a loop may lie a hair outside its box: the box is looked at with the tolerance.
  const m = SAME_PLACE_M;
  for (const b of boxes.near({ x0: p.x - m, x1: p.x + m, y0: p.y - m, y1: p.y + m })) {
    if (p.x < b.x0 - m || p.x > b.x1 + m || p.y < b.y0 - m || p.y > b.y1 + m) continue;
    reach = Math.max(reach, b.x1 + m);
    held.add(b);
  }
  return { held, reach };
}

/**
 * A test for points being inside the loops (even-odd, so inside a hole is outside), for many
 * points: the pieces are in a grid and the ray of a point only meets those near it (^938), so a
 * question costs what lies along the ray and not all the pieces of the surface.
 */
export function insideOf(loops: Loop[]): (p: Vec) => boolean {
  const grid = new Grid<{ piece: Piece; box: Box; seen: number }>(CELL_M, ROW_M);
  let query = 0;
  const boxes = new Grid<Box>(CELL_M);
  for (const loop of loops) {
    const box = boxAround(loop);
    boxes.add(box, box);
    for (const piece of loop) grid.add({ piece, box, seen: 0 }, boxAround([piece]));
  }
  return (p) => {
    const { held, reach } = holding(boxes, p);
    if (!held.size) return false;
    const ray: Piece = {
      type: 'line',
      P: p,
      Q: { x: p.x + RAY_REACH_M, y: p.y + RAY_REACH_M * RAY_SLOPE },
    };
    // The band of the ray, a hair wider: a piece that ends on the ray within the tolerance counts as crossing it.
    const to = {
      x0: p.x - SAME_PLACE_M,
      x1: reach,
      y0: p.y - SAME_PLACE_M,
      y1: p.y + (reach - p.x) * RAY_SLOPE + SAME_PLACE_M,
    };
    let n = 0;
    query++;
    grid.each(to, (e) => {
      if (e.seen === query || !held.has(e.box)) return;
      e.seen = query;
      n += crossPieces(ray, e.piece).length;
    });
    return n % 2 === 1;
  };
}

/** Whether a point is inside the loops (even-odd, so inside a hole is outside). */
export const insideLoops = (loops: Loop[], p: Vec): boolean => insideOf(loops)(p);

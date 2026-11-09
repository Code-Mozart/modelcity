import { offsetCurve } from './offset';
import { isDegenerate, line, pointOn } from './piece';
import type { Piece } from './types';
import { add, mod, mul, perp, TAU, type Vec } from './vec';

/**
 * The hull (skin) of a segment (^923): the outline of its road surface at its width. The sides are
 * the offset curves at half the width, to the right (+) and to the left (-) of the direction of
 * travel; the caps are straight across the end nodes (the normal of the heading there, for now,
 * ^157 refines them at junctions). Arcs that would turn inside out (a radius under half the width
 * on the inside) have no side piece there.
 */
export interface Hull {
  /** The right-hand side and the left-hand side, in the direction of the segment. */
  sides: [Piece[], Piece[]];
  /** The cap across the start node and the one across the end node, from the right to the left vertex. */
  caps: [Piece, Piece];
  /** The four corner vertices of the hull: start right, start left, end right, end left. */
  vertices: [Vec, Vec, Vec, Vec];
}

/** The two vertices across a point of the curve: right and left of its tangent, half the width each. */
function across(piece: Piece, t: number, half: number): [Vec, Vec] {
  const s = pointOn(piece, t);
  const n = mul(perp({ x: s.tx, y: s.ty }), half);
  return [add(s, n), add(s, mul(n, -1))];
}

/** The hull of a curve at `width`, or null for a curve that has no length. */
export function hullOf(pieces: Piece[], width: number): Hull | null {
  const real = pieces.filter((p) => !isDegenerate(p));
  const [first, last] = [real[0], real.at(-1)];
  if (!first || !last) return null;
  const half = width / 2;
  const [startR, startL] = across(first, 0, half);
  const [endR, endL] = across(last, 1, half);
  return {
    sides: [offsetCurve(real, half), offsetCurve(real, -half)],
    caps: [line(startR, startL), line(endR, endL)],
    vertices: [startR, startL, endR, endL],
  };
}

/** A box round some pieces: the end points and the extremes of the arcs, not the whole circle. */
export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const QUARTERS = [0, 1, 2, 3].map((k) => (k * Math.PI) / 2);

/** The points of a piece that bound it: its ends and the places an arc is furthest left, right, up and down. */
function extremes(p: Piece): Vec[] {
  if (p.type === 'line') return [p.P, p.Q];
  const on = QUARTERS.filter((q) => {
    const along = mod(Math.sign(p.da) * (q - p.a0), TAU);
    return along <= Math.abs(p.da);
  }).map((q) => add(p.c, { x: Math.cos(q) * p.r, y: Math.sin(q) * p.r }));
  return [p.P, p.Q, ...on];
}

/** The box that holds the pieces (tight round arcs, unlike the box of a whole circle). */
export function boxAround(pieces: Piece[]): Box {
  const pts = pieces.flatMap(extremes);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** Whether two boxes meet or overlap. */
export const boxesMeet = (a: Box, b: Box) =>
  a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;

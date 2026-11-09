import { offsetCurve } from './offset';
import { isDegenerate, line, pointOn } from './piece';
import { crossPieces } from '../snap/geometry';
import type { Piece } from './types';
import { add, angleOf, dist, mod, mul, perp, sub, TAU, type Vec } from './vec';

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

/** The piece cut short at `x`: its end (a line or an arc, the arc keeping its sense). */
function cutEnd(p: Piece, x: Vec): Piece {
  if (p.type === 'line') return { ...p, Q: x };
  const sign = Math.sign(p.da);
  return { ...p, Q: x, da: sign * mod(sign * (angleOf(sub(x, p.c)) - p.a0), TAU) };
}

/** The piece cut short at `x`: its start. */
function cutStart(p: Piece, x: Vec): Piece {
  if (p.type === 'line') return { ...p, P: x };
  const [sign, a1] = [Math.sign(p.da), p.a0 + p.da];
  const a0 = angleOf(sub(x, p.c));
  return { ...p, P: x, a0, da: sign * mod(sign * (a1 - a0), TAU) };
}

/**
 * Where an arc between two pieces of a side was left out (it would have turned inside out, a road
 * turning tighter than half its width, which only old projects and nodes that are too close can
 * have, ^942) the two pieces overshoot each other: they are cut at the place where they cross, the
 * sharp inner corner of the road.
 */
function joinGaps(side: Piece[]): Piece[] {
  const out: Piece[] = [];
  for (const piece of side) {
    const last = out.at(-1);
    const x = last && dist(last.Q, piece.P) > 1e-6 ? crossPieces(last, piece)[0] : undefined;
    if (last && x) out[out.length - 1] = cutEnd(last, x);
    out.push(last && x ? cutStart(piece, x) : piece);
  }
  return out;
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
    sides: [joinGaps(offsetCurve(real, half)), joinGaps(offsetCurve(real, -half))],
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

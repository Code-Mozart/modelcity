import { offsetPiece } from './offset';
import { isDegenerate, line, pointOn } from './piece';
import { crossPieces } from '../snap/geometry';
import type { Arc, Piece } from './types';
import { add, angleOf, mod, mul, perp, sub, TAU, type Vec } from './vec';

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
 * What takes the place of an arc whose offset would turn inside out (a road turning tighter than
 * half its width, which only old projects and nodes that are too close can have, ^942): the side
 * runs to the centre of the arc and on to where the offset of the arc ends, the way the swept road
 * is bounded there. So the side always reaches its end vertex.
 */
function throughCentre(arc: Arc, roff: number): Piece[] {
  const at = (a: number): Vec => add(arc.c, mul({ x: Math.cos(a), y: Math.sin(a) }, roff));
  return [line(at(arc.a0), arc.c), line(arc.c, at(arc.a0 + arc.da))];
}

/**
 * One side of the hull: the curve moved by `d`. An arc that cannot be moved so far is left out:
 * if the offsets of the pieces before and after cross, they are cut at the crossing, the sharp
 * inner corner of the road; else the side goes through the centre of the arc (^942).
 */
function sideOf(real: Piece[], d: number): Piece[] {
  const moved = real.map((p) => offsetPiece(p, d));
  const out: Piece[] = [];
  let cutNext: Vec | null = null;
  moved.forEach((o, i) => {
    const piece = real[i]!;
    if (o) {
      out.push(cutNext ? cutStart(o, cutNext) : o);
      cutNext = null;
    } else if (piece.type === 'arc') {
      const [last, next] = [out.at(-1), moved[i + 1]];
      const x = last && next ? crossPieces(last, next)[0] : undefined;
      if (last && x) {
        out[out.length - 1] = cutEnd(last, x);
        cutNext = x;
      } else out.push(...throughCentre(piece, piece.r - Math.sign(piece.da) * d));
    }
  });
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
    sides: [sideOf(real, half), sideOf(real, -half)],
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
  const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const p of pieces) {
    for (const e of extremes(p)) {
      box.x0 = Math.min(box.x0, e.x);
      box.x1 = Math.max(box.x1, e.x);
      box.y0 = Math.min(box.y0, e.y);
      box.y1 = Math.max(box.y1, e.y);
    }
  }
  return box;
}

/** Whether two boxes meet or overlap. */
export const boxesMeet = (a: Box, b: Box) =>
  a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;

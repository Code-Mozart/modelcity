import { distanceToPiece, nearestParam, pieceLength, pointOn, type Sample } from './piece';
import type { Piece } from './types';
import type { Vec } from './vec';

/** A part of the plane the samples must be in: a circle (the screen, taken round), world meters. */
export interface Within {
  c: Vec;
  r: number;
}

/**
 * The range of a piece, as lengths from its start, that can lie within the circle, or null if it
 * does not reach it (^864): two points of an arc in a circle of the radius `r` are at most about
 * `π r` apart along the arc, from the nearest point to the center.
 */
function reach(piece: Piece, length: number, within: Within): [number, number] | null {
  if (distanceToPiece(piece, within.c) > within.r) return null;
  const at = nearestParam(piece, within.c) * length;
  const span = Math.PI * within.r * 1.05;
  return [at - span, at + span];
}

/**
 * Points along a chain of pieces at regular distances, with the direction of travel (^80). The
 * first one lies `first` from the start, then every `spacing`; all lengths are in the same unit
 * (world meters, so a constant pixel spacing is `px / scale`). `piece` is the index of the piece
 * a point lies on. With `within` only the points that can be in that circle are made: at the
 * greatest zoom a road is a million pixels long, and the points of all of it are too many (^864).
 */
export function samplesAlong(
  pieces: Piece[],
  spacing: number,
  first = spacing / 2,
  within?: Within,
): (Sample & { piece: number })[] {
  const out: (Sample & { piece: number })[] = [];
  let next = first;
  for (const [index, piece] of pieces.entries()) {
    const length = pieceLength(piece);
    if (length < 1e-9) continue;
    const range: [number, number] | null = within ? reach(piece, length, within) : [0, length];
    if (range && range[1] >= next) {
      // The same points as without a range: the first one of the range on the grid of `spacing` from `next`.
      const skip = Math.max(0, Math.ceil((range[0] - next) / spacing));
      for (let at = next + skip * spacing; at <= Math.min(length, range[1]); at += spacing) {
        out.push({ ...pointOn(piece, at / length), piece: index });
      }
    }
    if (next <= length) next += (Math.floor((length - next) / spacing) + 1) * spacing;
    next -= length;
  }
  return out;
}

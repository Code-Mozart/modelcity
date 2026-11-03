import { pointOn } from './piece';
import type { Piece } from './types';
import { dist, type Vec } from './vec';

/** The length of a piece: a line's, or an arc's along the arc (^303). */
const pieceLength = (p: Piece): number =>
  p.type === 'arc' ? Math.abs(p.da) * p.r : dist(p.P, p.Q);

/** The length of a curve in meters: on bends the arc length, not the distance of the ends (^303). */
export const lengthOf = (pieces: Piece[]): number => pieces.reduce((s, p) => s + pieceLength(p), 0);

/** The bend angle of an arc in degrees (^303). */
export const bendAngleDeg = (p: { da: number }): number => (Math.abs(p.da) * 180) / Math.PI;

/** The place half way along a curve, with its direction: where the length is shown (^303). */
export function middleOf(pieces: Piece[]): (Vec & { tx: number; ty: number }) | null {
  const half = lengthOf(pieces) / 2;
  let walked = 0;
  for (const p of pieces) {
    const len = pieceLength(p);
    if (len > 0 && walked + len >= half - 1e-9) return pointOn(p, (half - walked) / len);
    walked += len;
  }
  return null;
}

/** What the measurements panel shows (^323): the total length of all segments and statistics of the bend radii (null without bends). */
export interface Summary {
  length: number;
  radius: { min: number; max: number; avg: number; median: number } | null;
}

/** The measurements of all segments, from their pieces (^323). */
export function summaryOf(segments: Piece[][]): Summary {
  const radii = segments
    .flat()
    .flatMap((p) => (p.type === 'arc' && Math.abs(p.da) > 1e-3 ? [p.r] : []))
    .sort((a, b) => a - b);
  const mid = Math.floor(radii.length / 2);
  const median = radii.length % 2 ? radii[mid]! : ((radii[mid - 1] ?? 0) + (radii[mid] ?? 0)) / 2;
  return {
    length: segments.reduce((s, pieces) => s + lengthOf(pieces), 0),
    radius: radii.length
      ? {
          min: radii[0]!,
          max: radii.at(-1)!,
          avg: radii.reduce((s, r) => s + r, 0) / radii.length,
          median,
        }
      : null,
  };
}

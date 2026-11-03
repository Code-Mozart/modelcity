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

/** What the measurements panel shows (^323, ^342): of the selection, the length, the bounding box, the counts and statistics of the bend radii. */
export interface Summary {
  length: number;
  /** The axis aligned box of the curves, along the compass directions: east-west and north-south extent, meters. */
  box: { width: number; height: number };
  nodes: number;
  segments: number;
  radius: { min: number; max: number; avg: number; median: number } | null;
}

/** The points of a piece that bound it: its ends, and where an arc is farthest east, south, west and north. */
function extremes(p: Piece): Vec[] {
  if (p.type === 'line') return [p.P, p.Q];
  const mid = (k: number) => {
    const a = (k * Math.PI) / 2;
    const rel =
      ((((a - p.a0) / Math.sign(p.da || 1)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return rel <= Math.abs(p.da)
      ? [{ x: p.c.x + p.r * Math.cos(a), y: p.c.y + p.r * Math.sin(a) }]
      : [];
  };
  return [p.P, p.Q, ...[0, 1, 2, 3].flatMap(mid)];
}

/** The measurements of the selected segments, from their pieces, and the number of selected nodes (^323, ^342). */
export function summaryOf(segments: Piece[][], nodes = 0): Summary {
  const radii = segments
    .flat()
    .flatMap((p) => (p.type === 'arc' && Math.abs(p.da) > 1e-3 ? [p.r] : []))
    .sort((a, b) => a - b);
  const mid = Math.floor(radii.length / 2);
  const median = radii.length % 2 ? radii[mid]! : ((radii[mid - 1] ?? 0) + (radii[mid] ?? 0)) / 2;
  const pts = segments.flat().flatMap(extremes);
  const [xs, ys] = [pts.map((p) => p.x), pts.map((p) => p.y)];
  const span = (v: number[]) => (v.length ? Math.max(...v) - Math.min(...v) : 0);
  return {
    length: segments.reduce((s, pieces) => s + lengthOf(pieces), 0),
    box: { width: span(xs), height: span(ys) },
    nodes,
    segments: segments.length,
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

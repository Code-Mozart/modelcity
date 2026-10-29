import type { Vec } from './vec';

/** +1 or -1: the rotation sense of the first turn of an edge. */
export type Dir = 1 | -1;

/** A node lies on the curve and carries a heading `th` in radians (^6). */
export interface PathNode extends Vec {
  th: number;
}

/** The fixed middle line of an S-curve (point on it and direction). */
export interface MidLine extends Vec {
  ux: number;
  uy: number;
}

/** Stored shape tag of an edge (^7). */
export type ShapeTag = { kind: 'C' } | { kind: 'S'; s: Dir; mid?: MidLine } | { kind: 'H'; s: Dir };

export interface Line {
  type: 'line';
  P: Vec;
  Q: Vec;
}

export interface Arc {
  type: 'arc';
  P: Vec;
  Q: Vec;
  c: Vec;
  r: number;
  /** Start angle of P around c. */
  a0: number;
  /** Signed sweep. */
  da: number;
}

export type Piece = Line | Arc;

/** Short perpendicular marker where a construction line touches the curve. */
export interface Tick {
  at: Vec;
  dir: Vec;
  role: 'blue' | 'teal';
}

/** Input shared by all edge builders: both end nodes and the requested radius (null = auto). */
export interface EdgeInput {
  p: PathNode;
  q: PathNode;
  Rs: number | null;
}

interface RadiusInfo {
  R: number;
  Rmax: number;
  auto: boolean;
}

export interface LineEdge {
  kind: 'line';
  pieces: Piece[];
}

/** One bend: line, arc, line (^6). */
export interface BendEdge extends RadiusInfo {
  kind: 'C';
  pieces: Piece[];
  /** Where the two heading lines meet. */
  C: Vec;
  /** Turning angle between the headings. */
  turn: number;
  T1: Vec;
  T2: Vec;
  ticks: Tick[];
}

/** S-curve or hook: two arcs of one radius (^6). */
export interface TwoArcEdge extends RadiusInfo {
  kind: 'S' | 'H';
  pieces: Piece[];
  s1: Dir;
  mid?: MidLine;
  /** Where each heading line meets the middle straight (null if parallel). */
  k1: Vec | null;
  k2: Vec | null;
  /** Midpoint of the middle straight (the inflection point of an S). */
  J: Vec;
  axis: { a: Vec; b: Vec };
  straight: number;
  ticks: Tick[];
}

export type Edge = LineEdge | BendEdge | TwoArcEdge;

export const edgeRadius = (e: Edge) => (e.kind === 'line' ? null : e.R);

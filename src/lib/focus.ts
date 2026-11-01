import type { HandleType } from './curves/handles';

/**
 * What the user is pointing at or dragging: a handle of a road. For node and heading handles `i`
 * is the node index, for the others the edge index.
 */
export interface Focus {
  road: number;
  type: HandleType;
  i: number;
  /** For a radius handle: the arc and the place on it (^128). */
  k?: number;
  t?: number;
}

/**
 * Whether the focus is on edge `edge` of road `road`: on one of its two nodes (or their heading
 * tips), or on one of its own control points (^60).
 */
export function touchesEdge(focus: Focus | null, road: number, edge: number): boolean {
  return !!focus && focus.road === road && belongsToEdge(focus, edge);
}

/** Whether a handle is one of the control points of segment `edge` of its road. */
export const belongsToEdge = (h: { type: HandleType; i: number }, edge: number) =>
  h.type === 'node' || h.type === 'head' ? h.i === edge || h.i === edge + 1 : h.i === edge;

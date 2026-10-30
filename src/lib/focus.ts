import type { HandleType } from './curves/handles';

/**
 * What the user is pointing at or dragging: a handle of a road. For node and heading handles `i`
 * is the node index, for the others the edge index.
 */
export interface Focus {
  road: number;
  type: HandleType;
  i: number;
}

/**
 * Whether the focus is on edge `edge` of road `road`: on one of its two nodes (or their heading
 * tips), or on one of its own control points (^60).
 */
export function touchesEdge(focus: Focus | null, road: number, edge: number): boolean {
  if (!focus || focus.road !== road) return false;
  if (focus.type === 'node' || focus.type === 'head')
    return focus.i === edge || focus.i === edge + 1;
  return focus.i === edge;
}

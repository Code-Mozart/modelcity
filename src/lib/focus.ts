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

/** What to show for one edge (^51). */
export interface Reveal {
  /** Construction geometry: blue lines, circle, bisector, ticks, turquoise lines and dots. */
  guides: boolean;
  /** The radius labels. */
  labels: boolean;
}

const NONE: Reveal = { guides: false, labels: false };

/**
 * Edge `edge` of road `road` shows its construction only while it is being worked on: its own
 * blue or turquoise points, its orange ring or one of its two nodes are hovered or dragged
 * (guides, ^55), and its radius labels while its orange ring or one of its two nodes is (labels).
 */
export function revealed(focus: Focus | null, road: number, edge: number): Reveal {
  if (!focus || focus.road !== road) return NONE;
  const { type, i } = focus;
  if (type === 'node' || type === 'head') {
    const touches = i === edge || i === edge + 1;
    return touches ? { guides: true, labels: true } : NONE;
  }
  if (i !== edge) return NONE;
  return type === 'rad' ? { guides: true, labels: true } : { guides: true, labels: false };
}

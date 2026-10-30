import type { EdgeRef } from './curves/path';
import type { RoadHandle } from './curves/roads';
import { touchesEdge, type Focus } from './focus';
import { nearEdge, nearHandle, type Pointer } from './proximity';

/**
 * The scaffold of a road segment (the curve between two nodes) is all its construction and
 * control gizmos: the blue lines, circle, ticks and control points, the heading arrows, the
 * turquoise lines and points (filled or hollow), and the orange control point with its label. What
 * is always shown is the skeleton: the curves and the node dots. The scaffold is all or nothing
 * per segment (^60).
 */
export interface ScaffoldInput {
  road: number;
  edges: EdgeRef[];
  handles: RoadHandle[];
  focus: Focus | null;
  pointer: Pointer | null;
}

/** Whether a handle is one of the control points of segment `edge`. */
const belongs = (h: RoadHandle, edge: number) =>
  h.type === 'node' || h.type === 'head' ? h.i === edge || h.i === edge + 1 : h.i === edge;

/**
 * For each segment of the road: show its scaffold. Yes if its curve or any of its control points
 * (the nodes, the heading tips, the blue, turquoise and orange points) is hovered or dragged, or
 * the pointer is near its curve or near any of the control points.
 */
export function activeSegments({ road, edges, handles, focus, pointer }: ScaffoldInput): boolean[] {
  return edges.map((ref) => {
    if (touchesEdge(focus, road, ref.i) || nearEdge(ref.E, pointer)) return true;
    return handles.some((h) => h.road === road && belongs(h, ref.i) && nearHandle(h, pointer));
  });
}

/**
 * A node's heading arrow belongs to the scaffold of the segments on both sides of the node; a node
 * without any segment (a road with its first node only) always shows its arrow.
 */
export function arrowShown(active: boolean[], node: number): boolean {
  if (active.length === 0) return true;
  return active[node - 1] === true || active[node] === true;
}

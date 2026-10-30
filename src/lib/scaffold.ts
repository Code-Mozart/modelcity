import type { EdgeRef } from './curves/path';
import { distanceToPiece, isDegenerate } from './curves/piece';
import type { RoadHandle } from './curves/roads';
import { touchesEdge, type Focus } from './focus';
import { CURVE_NEAR_PX, HANDLE_NEAR_PX, type Pointer } from './proximity';

/**
 * The scaffold of a road segment (the curve between two nodes) is all its construction and
 * control gizmos: the blue lines, circle, ticks and control points, the heading arrows, the
 * turquoise lines and points (filled or hollow), and the orange control point with its label. What
 * is always shown is the skeleton: the curves and the node dots. The scaffold is all or nothing
 * per segment, and only ever shown for a single segment at a time (^60, ^66).
 */
export interface ScaffoldInput {
  roads: { edges: EdgeRef[] }[];
  handles: RoadHandle[];
  focus: Focus | null;
  pointer: Pointer | null;
}

export interface SegmentRef {
  road: number;
  edge: number;
}

/** Whether a handle is one of the control points of segment `edge`. */
const belongs = (h: RoadHandle, edge: number) =>
  h.type === 'node' || h.type === 'head' ? h.i === edge || h.i === edge + 1 : h.i === edge;

/** Distances, in screen pixels, from the pointer to a segment's curve and to its control points. */
interface Scores {
  ref: SegmentRef;
  curve: number;
  points: number;
}

function scoresOf(input: ScaffoldInput, ref: SegmentRef, pointer: Pointer): Scores {
  const edge = input.roads[ref.road]!.edges[ref.edge]!;
  const { pt, scale } = pointer;
  const curve = Math.min(
    ...edge.E.pieces.filter((p) => !isDegenerate(p)).map((p) => distanceToPiece(p, pt)),
  );
  const points = Math.min(
    ...input.handles
      .filter((h) => h.road === ref.road && belongs(h, ref.edge))
      .map((h) => Math.hypot(h.x - pt.x, h.y - pt.y)),
  );
  return { ref, curve: curve * scale, points: points * scale };
}

const allSegments = ({ roads }: ScaffoldInput): SegmentRef[] =>
  roads.flatMap((r, road) => r.edges.map((e) => ({ road, edge: e.i })));

const closest = (list: Scores[], by: (s: Scores) => number): Scores | undefined =>
  list.reduce<Scores | undefined>((best, s) => (!best || by(s) < by(best) ? s : best), undefined);

/**
 * The segment of the hovered or dragged handle. A blue, turquoise or orange point belongs to one
 * segment; a node or heading tip to two, then the one whose curve is closer to the pointer
 * (without a pointer, the one that starts at the node).
 */
function focusedSegment(input: ScaffoldInput): SegmentRef | null {
  const { focus, pointer } = input;
  if (!focus) return null;
  const exists = (edge: number) => input.roads[focus.road]?.edges.some((e) => e.i === edge);
  const options = [focus.i, focus.i - 1]
    .filter((edge) => touchesEdge(focus, focus.road, edge) && exists(edge))
    .map((edge) => ({ road: focus.road, edge }));
  if (options.length < 2 || !pointer) return options[0] ?? null;
  const scores = options.map((ref) => scoresOf(input, ref, pointer));
  return closest(scores, (s) => s.curve)?.ref ?? null;
}

/**
 * The one segment whose scaffold is shown (^66), or null. A hovered or dragged control point
 * decides. Otherwise the segment the pointer is on (within 20 px of its curve) wins, the closest
 * curve first; otherwise the segment with the closest control point within 48 px, nearer curves
 * breaking ties.
 */
export function activeSegment(input: ScaffoldInput): SegmentRef | null {
  const focused = focusedSegment(input);
  if (focused || !input.pointer) return focused;
  const scores = allSegments(input).map((ref) => scoresOf(input, ref, input.pointer!));
  const onCurve = closest(
    scores.filter((s) => s.curve <= CURVE_NEAR_PX),
    (s) => s.curve,
  );
  if (onCurve) return onCurve.ref;
  const near = scores.filter((s) => s.points <= HANDLE_NEAR_PX);
  return closest(near, (s) => s.points + s.curve * 1e-6)?.ref ?? null;
}

/** Which segments of each road show their scaffold: at most one overall. */
export function activeFlags(input: ScaffoldInput): boolean[][] {
  const active = activeSegment(input);
  return input.roads.map((r, road) =>
    r.edges.map((e) => active?.road === road && active.edge === e.i),
  );
}

/**
 * A node's heading arrow belongs to the scaffold of the segments on both sides of the node; a node
 * without any segment (a road with its first node only) always shows its arrow.
 */
export function arrowShown(active: boolean[], node: number): boolean {
  if (active.length === 0) return true;
  return active[node - 1] === true || active[node] === true;
}

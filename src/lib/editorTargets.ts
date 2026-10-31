import { autoHeading, autoHeadingBefore } from './curves/path';
import type { NodeRef, RoadHandle, RoadHit, Roads } from './curves/roads';
import { activeEnd, curveAction, nodeAction } from './curves/junctions';
import type { PathNode } from './curves/types';
import { allSelected, curveNodes, isSelected, pickedCount } from './selection';
import { branchOfEdge, branchOfNode } from './curves/branches';
import type { Hover, Placement } from './editorTypes';
import type { HintTarget } from './hints';

/** The road being drawn and the end new nodes attach to (^65). */
export interface Drawn {
  roads: Roads;
  active: number | null;
  end: 'start' | 'end';
  selection: NodeRef[];
}

function handleTarget(drawn: Drawn, handle: RoadHandle, drawing: boolean): HintTarget {
  const { selection, roads } = drawn;
  const ref = { road: handle.road, node: handle.i };
  const node = handle.type === 'node';
  return {
    kind: 'handle',
    type: handle.type,
    act: node && drawing ? nodeAction(drawn, ref) : null,
    selected: isSelected(selection, ref),
    lane: node && !drawing && allSelected(selection, branchOfNode(roads, ref)),
  };
}

function curveTarget(drawn: Drawn, hit: RoadHit, drawing: boolean): HintTarget {
  const { selection, roads } = drawn;
  const { road, ref } = hit;
  return {
    kind: 'curve',
    picked: pickedCount(selection, curveNodes(road, ref.i)),
    act: drawing ? curveAction(drawn, road) : null,
    lane: !drawing && allSelected(selection, branchOfEdge(roads, { road, i: ref.i })),
  };
}

/** What the control hints are about (^49). */
export function targetOf(drawn: Drawn, hover: Hover | null, drawing: boolean): HintTarget {
  if (hover?.kind === 'handle') return handleTarget(drawn, hover.handle, drawing);
  return hover?.kind === 'candidate' ? curveTarget(drawn, hover.hit, drawing) : { kind: 'empty' };
}

/**
 * Make an end node of the road being drawn, or of any road when none is, the one the next node
 * attaches to (^65): the road becomes the road being drawn, at that end.
 */
export function extendTo(drawn: Drawn, ref: NodeRef): Drawn {
  const nodes = drawn.roads[ref.road]?.nodes.length ?? 0;
  const end = ref.node === 0 && nodes > 1 ? 'start' : 'end';
  return { ...drawn, active: ref.road, end, selection: [ref] };
}

export function cursorOf(hover: Hover | null, drawing: boolean): string {
  if (hover?.kind === 'handle') return 'grab';
  if (hover?.kind === 'candidate') return drawing ? 'copy' : 'pointer';
  return drawing ? 'crosshair' : 'default';
}

/** The node, or point on a curve with its heading, that a click would merge the road into (^123). */
function mergeTarget(d: Drawn, hover: Hover): PathNode | null {
  if (hover.kind === 'handle' && hover.handle.type === 'node') {
    const ref = { road: hover.handle.road, node: hover.handle.i };
    return nodeAction(d, ref) === 'merge' ? d.roads[ref.road]!.nodes[ref.node]! : null;
  }
  if (hover.kind !== 'candidate' || curveAction(d, hover.hit.road) !== 'merge') return null;
  const { at } = hover.hit;
  return { x: at.x, y: at.y, th: Math.atan2(at.ty, at.tx) };
}

/**
 * The preview of the curve a merge would add: from the node being drawn from to the target under
 * the pointer (^123, ^125).
 */
export function mergePreview(
  d: Drawn,
  hover: Hover | null,
): Extract<Hover, { kind: 'preview' }> | null {
  const end = activeEnd(d);
  const from = end && d.roads[end.road]?.nodes[end.node];
  const node = from && hover ? mergeTarget(d, hover) : null;
  return from && node ? { kind: 'preview', ref: from, end: d.end, node } : null;
}

/** The preview of the node a click would add: where, its heading, and the node it attaches to. */
export function previewOf({ roads, active, end }: Drawn, at: Placement): Hover {
  const nodes = active === null ? undefined : roads[active]?.nodes;
  const ref = (end === 'end' ? nodes?.[nodes.length - 1] : nodes?.[0]) ?? null;
  const heading = end === 'end' ? autoHeading : autoHeadingBefore;
  const th = at.th ?? (ref ? heading(ref, at.pt) : 0);
  return { kind: 'preview', ref, end, node: { x: at.pt.x, y: at.pt.y, th } };
}

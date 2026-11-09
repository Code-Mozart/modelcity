import { previewPlaced } from './followParallels';
import type { PathNode } from '../curves/types';
import { nodeAtSample, type RoadHandle, type RoadHit } from './chains';
import { edgeOfId, nodeOf } from '../model/graph';
import {
  autoHeadingFor,
  branchOfEdge,
  branchOfNode,
  curveAction,
  leafWay,
  nodeAction,
} from '../model/junction';
import { allSelected, isSelected, onSelection, pickedCount } from './selection';
import type { Hover, Placement, Snapshot } from './types';
import type { HintTarget } from '../hints/hints';

/** The road being drawn and the end new nodes attach to (^65), with the selection. */
export type Drawn = Snapshot;

/** A click on a radius point in draw mode splits or merges there, as on the curve (^278). */
const radiusAct = (drawn: Drawn, handle: RoadHandle, drawing: boolean) =>
  drawing && handle.type === 'rad' ? curveAction(drawn) : null;

function handleTarget(drawn: Drawn, handle: RoadHandle, drawing: boolean): HintTarget {
  const { selection, graph } = drawn;
  const node = handle.type === 'node';
  return {
    kind: 'handle',
    type: handle.type,
    act: node && drawing ? nodeAction(drawn, handle.id) : radiusAct(drawn, handle, drawing),
    selected: (node || handle.type === 'head') && isSelected(selection, handle.id),
    lane: node && !drawing && allSelected(selection, branchOfNode(graph, handle.id)),
    onSelection: node && onSelection(selection, [handle.id]),
    way: node && drawing ? leafWay(graph, handle.id) : undefined,
  };
}

function curveTarget(drawn: Drawn, hit: RoadHit, drawing: boolean): HintTarget {
  const { selection, graph } = drawn;
  const e = edgeOfId(graph, hit.edge);
  return {
    kind: 'curve',
    picked: e ? pickedCount(selection, [e.start, e.end]) : 0,
    act: drawing ? curveAction(drawn) : null,
    lane: !drawing && allSelected(selection, branchOfEdge(graph, hit.edge)),
    onSelection: !!e && onSelection(selection, [e.start, e.end]),
  };
}

/** What the control hints are about (^49). */
export function targetOf(drawn: Drawn, hover: Hover | null, drawing: boolean): HintTarget {
  if (hover?.kind === 'handle') return handleTarget(drawn, hover.handle, drawing);
  if (hover?.kind === 'candidate' && hover.derived) return { kind: 'derived' };
  return hover?.kind === 'candidate' ? curveTarget(drawn, hover.hit, drawing) : { kind: 'empty' };
}

export function cursorOf(hover: Hover | null, drawing: boolean): string {
  if (hover?.kind === 'handle' || (hover?.kind === 'candidate' && hover.derived)) return 'grab';
  if (hover?.kind === 'candidate') return drawing ? 'copy' : 'pointer';
  return drawing ? 'crosshair' : 'default';
}

/** The node, or point on a curve with its heading, that a click would merge the road into (^123). */
function mergeTarget(d: Drawn, hover: Hover): PathNode | null {
  if (hover.kind === 'handle' && hover.handle.type === 'node') {
    const action = nodeAction(d, hover.handle.id);
    return action === 'merge' || action === 'close'
      ? (nodeOf(d.graph, hover.handle.id) ?? null)
      : null;
  }
  if (hover.kind !== 'candidate' || curveAction(d) !== 'merge') return null;
  return nodeAtSample(hover.hit.at);
}

/**
 * The preview of the curve a merge would add: from the node being drawn from to the target under
 * the pointer (^123, ^125).
 */
export function mergePreview(
  d: Drawn,
  hover: Hover | null,
): Extract<Hover, { kind: 'preview' }> | null {
  const from = d.active === null ? undefined : nodeOf(d.graph, d.active);
  const node = from && hover ? mergeTarget(d, hover) : null;
  return from && node ? { kind: 'preview', ref: from, end: d.end, node } : null;
}

/** The node a click would add: where, its heading (that of a tower it is in, ^867), and the radius of its segment (^877). */
function placedPreview({ graph, active, end }: Drawn, at: Placement, ref: PathNode | null) {
  const th = at.th ?? (ref ? autoHeadingFor(end)(ref, at.pt) : 0);
  const node = { x: at.pt.x, y: at.pt.y, th };
  const placed = ref && active !== null ? previewPlaced(graph, active, node, end) : null;
  return { node: { ...node, th: placed?.th ?? th }, radius: placed?.radius ?? null };
}

/** The preview of the node a click would add: where, its heading, and the node it attaches to. */
export function previewOf(d: Drawn, at: Placement): Hover {
  const ref = (d.active === null ? undefined : nodeOf(d.graph, d.active)) ?? null;
  return { kind: 'preview', ref, end: d.end, ...placedPreview(d, at, ref) };
}

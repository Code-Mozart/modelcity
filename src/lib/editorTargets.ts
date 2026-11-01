import type { PathNode } from './curves/types';
import { nodeAtSample, type RoadHandle, type RoadHit } from './model/chains';
import { edgeOfId, edgesIn, edgesOut, nodeOf } from './model/graph';
import {
  autoHeadingFor,
  branchOfEdge,
  branchOfNode,
  curveAction,
  farEnd,
  nodeAction,
} from './model/junction';
import { allSelected, isSelected, pickedCount } from './selection';
import type { Hover, Placement, Snapshot } from './editorTypes';
import type { HintTarget } from './hints';

/** The road being drawn and the end new nodes attach to (^65), with the selection. */
export type Drawn = Snapshot;

function handleTarget(drawn: Drawn, handle: RoadHandle, drawing: boolean): HintTarget {
  const { selection, graph } = drawn;
  const node = handle.type === 'node';
  return {
    kind: 'handle',
    type: handle.type,
    act: node && drawing ? nodeAction(drawn, handle.id) : null,
    selected: (node || handle.type === 'head') && isSelected(selection, handle.id),
    lane: node && !drawing && allSelected(selection, branchOfNode(graph, handle.id)),
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
  };
}

/** What the control hints are about (^49). */
export function targetOf(drawn: Drawn, hover: Hover | null, drawing: boolean): HintTarget {
  if (hover?.kind === 'handle') return handleTarget(drawn, hover.handle, drawing);
  return hover?.kind === 'candidate' ? curveTarget(drawn, hover.hit, drawing) : { kind: 'empty' };
}

/**
 * Make an end node, of any road when none is drawn, the one the next node attaches to (^65): the
 * road becomes the road being drawn, at that end, and it started at its other end.
 */
export function extendTo(drawn: Drawn, id: number): Drawn {
  const { graph } = drawn;
  const start = edgesOut(graph, id).length > 0 && edgesIn(graph, id).length === 0;
  const end = start ? 'start' : 'end';
  return { ...drawn, active: id, end, origin: farEnd(graph, id), selection: [id] };
}

export function cursorOf(hover: Hover | null, drawing: boolean): string {
  if (hover?.kind === 'handle') return 'grab';
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

/** The preview of the node a click would add: where, its heading, and the node it attaches to. */
export function previewOf({ graph, active, end }: Drawn, at: Placement): Hover {
  const ref = (active === null ? undefined : nodeOf(graph, active)) ?? null;
  const th = at.th ?? (ref ? autoHeadingFor(end)(ref, at.pt) : 0);
  return { kind: 'preview', ref, end, node: { x: at.pt.x, y: at.pt.y, th } };
}

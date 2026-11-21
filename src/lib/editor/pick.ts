import type { Vec } from '../curves/vec';
import { NODE_HIT_PX } from '../curves/handles';
import { interactable, nodeAt, segmentAt, type LoadedMap } from '../map/hit';
import { handleAt, type RowHandle } from './handles';
import { afterNodeClick, afterSegmentClick, afterVoidClick, type Selection } from './selection';

/** What is under the pointer (^1257): a node, a control point of the scaffold (^1265), or a segment (with its two nodes), or nothing. */
export type Hover =
  | { kind: 'node'; id: number }
  | { kind: 'handle'; handle: RowHandle }
  | { kind: 'segment'; edge: number; nodes: [number, number] };

/** How far from the pointer something is still under it: a number of pixels (^883), in meters at this scale. */
export const reachOf = (touch: boolean, scale: number) =>
  NODE_HIT_PX[touch ? 'touch' : 'mouse'] / scale;

/**
 * What the pointer is on (`main`'s `hoverAt`): a node right under it, then the nearest control
 * point of the scaffold (^137, ^1265), then the nearest segment (^1257); only what is loaded can be
 * (a chunk that is loading is not interactable).
 */
export function pick(map: LoadedMap, pt: Vec, at: { scale: number; touch: boolean }): Hover | null {
  const reach = reachOf(at.touch, at.scale);
  const node = nodeAt(map, pt, reach);
  if (node) return { kind: 'node', id: node[0] };
  const handle = interactable(map, pt, reach) && handleAt(map, pt, at.scale, at.touch);
  if (handle) return { kind: 'handle', handle };
  const seg = segmentAt(map, pt, reach);
  return seg
    ? { kind: 'segment', edge: seg.edge[0], nodes: [seg.nodes[0][0], seg.nodes[1][0]] }
    : null;
}

/** The selection after a click without moving (^71 to ^75): on a node, on a segment, or on nothing. */
export function afterClick(sel: Selection, on: Hover | null, shift: boolean): Selection {
  if (on?.kind === 'node') return afterNodeClick(sel, on.id, shift);
  // A heading point selects its node (^74); a bend or radius point leaves the selection.
  if (on?.kind === 'handle')
    return on.handle.type === 'head' ? afterNodeClick(sel, on.handle.node, shift) : sel;
  if (on?.kind === 'segment') return afterSegmentClick(sel, on.nodes, shift);
  return afterVoidClick(sel, shift);
}

/** The nodes that a hover would select with a click: for its outline (^99). */
export const nodesOf = (on: Hover | null): number[] =>
  on?.kind === 'node' ? [on.id] : on?.kind === 'segment' ? on.nodes : [];

/** What kind of thing is under the pointer, for the hints: a node, a segment, or a control point by its type. */
export type HoverKind = 'node' | 'segment' | RowHandle['type'] | null;
export const hoverKind = (h: Hover | null): HoverKind =>
  h === null ? null : h.kind === 'handle' ? h.handle.type : h.kind;

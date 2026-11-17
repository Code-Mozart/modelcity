import type { Vec } from '../curves/vec';
import { NODE_HIT_PX } from '../curves/handles';
import { nodeAt, segmentAt, type LoadedMap } from '../map/hit';
import { afterNodeClick, afterSegmentClick, afterVoidClick, type Selection } from './selection';

/** What is under the pointer in select mode (^1257): a node, or a segment (with its two nodes), or nothing. */
export type Hover =
  { kind: 'node'; id: number } | { kind: 'segment'; edge: number; nodes: [number, number] };

/** How far from the pointer something is still under it: a number of pixels (^883), in meters at this scale. */
export const reachOf = (touch: boolean, scale: number) =>
  NODE_HIT_PX[touch ? 'touch' : 'mouse'] / scale;

/** What the pointer is on: a node wins over a segment, then the nearest segment (^1257); only what is loaded can be (a chunk that is loading is not interactable). */
export function pick(map: LoadedMap, pt: Vec, reach: number): Hover | null {
  const node = nodeAt(map, pt, reach);
  if (node) return { kind: 'node', id: node[0] };
  const seg = segmentAt(map, pt, reach);
  return seg
    ? { kind: 'segment', edge: seg.edge[0], nodes: [seg.nodes[0][0], seg.nodes[1][0]] }
    : null;
}

/** The selection after a click without moving (^71 to ^75): on a node, on a segment, or on nothing. */
export function afterClick(sel: Selection, on: Hover | null, shift: boolean): Selection {
  if (on?.kind === 'node') return afterNodeClick(sel, on.id, shift);
  if (on?.kind === 'segment') return afterSegmentClick(sel, on.nodes, shift);
  return afterVoidClick(sel, shift);
}

/** The nodes that a hover would select with a click: for its outline (^99). */
export const nodesOf = (on: Hover | null): number[] =>
  on?.kind === 'node' ? [on.id] : on?.kind === 'segment' ? on.nodes : [];

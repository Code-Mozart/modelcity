import { applyDrag, dragHeading } from './curves/drag';
import { closeOver, syncHeadings } from './curves/junctions';
import { appendNode, insertNode, prependNode, withNode } from './curves/path';
import {
  moveNodes,
  replaceRoad,
  startRoad,
  type NodeRef,
  type RoadHit,
  type Roads,
} from './curves/roads';
import { dist, type Vec } from './curves/vec';
import { withSharedRadius } from './editorPress';
import type { Drawn } from './editorTargets';
import type { Placement, PointerInfo, Press } from './editorTypes';

/** The node a click at `pt` would place: where the pointer is, with the automatic heading. */
export const placementAt = (pt: Vec): Placement => ({ pt, th: null });

const withHeading = (roads: Roads, ref: NodeRef, th: number | null): Roads => {
  if (th === null) return roads;
  const path = withNode(roads[ref.road]!, ref.node, { th });
  return replaceRoad(roads, ref.road, path);
};

/** A node at the end of the road being drawn, or the first node of a new road (^40). */
export function placeNode(d: Drawn, at: Placement): { drawn: Drawn; ref: NodeRef } {
  if (d.active === null) {
    const r = startRoad(d.roads, at.pt);
    const ref = { road: r.road, node: 0 };
    return {
      drawn: { ...d, roads: withHeading(r.roads, ref, at.th), active: r.road, selection: [ref] },
      ref,
    };
  }
  const add = d.end === 'end' ? appendNode : prependNode;
  const r = add(d.roads[d.active]!, at.pt);
  const ref = { road: d.active, node: r.sel };
  const roads = withHeading(replaceRoad(d.roads, d.active, r.path), ref, at.th);
  return { drawn: { ...d, roads, selection: [ref] }, ref };
}

/** Insert a node on a curve; the curve does not change (^10). */
export function insertAt(d: Drawn, hit: RoadHit): { drawn: Drawn; ref: NodeRef } {
  const r = insertNode(d.roads[hit.road]!, hit);
  const ref = { road: hit.road, node: r.sel };
  return { drawn: { ...d, roads: replaceRoad(d.roads, hit.road, r.path), selection: [ref] }, ref };
}

/** Start a new road at an existing node: a split (^23). The new road shares the node. */
export function splitAt(d: Drawn, ref: NodeRef): Drawn {
  const n = d.roads[ref.road]!.nodes[ref.node]!;
  const r = startRoad(d.roads, n);
  const roads = withHeading(r.roads, { road: r.road, node: 0 }, n.th);
  return { roads, active: r.road, end: 'end', selection: closeOver(roads, [ref]) };
}

/** End the road being drawn at an existing node: a merge (^23). The road shares the node. */
export function mergeInto(d: Drawn, ref: NodeRef): Drawn {
  const n = d.roads[ref.road]!.nodes[ref.node]!;
  const r = placeNode(d, { pt: n, th: n.th });
  return { ...r.drawn, selection: closeOver(r.drawn.roads, [ref]) };
}

/**
 * The roads after dragging the grabbed handle to the pointer: a group moves along, a radius is
 * shared, shared nodes keep one heading (^23, ^71, ^77).
 */
export function dragStep(d: Drawn, press: Extract<Press, { kind: 'drag' }>, info: PointerInfo) {
  const { road } = press;
  const { handle } = press.drag;
  const before = d.roads[road]!;
  const path = applyDrag(before, press.drag, info.pt, { snap: info.shift });
  const next = withSharedRadius(replaceRoad(d.roads, road, path), d.selection, press);
  const to = path.nodes[handle.i]!;
  const delta = { x: to.x - press.origin.x, y: to.y - press.origin.y };
  const group = handle.type === 'node' ? press.group : [];
  const moved = group.length ? moveNodes(next, group, delta) : next;
  return syncHeadings(moved, road, before);
}

/** Dragging while a node is placed sets its heading, from where it was placed (^40). */
export function placeStep(roads: Roads, ref: NodeRef, info: PointerInfo): Roads {
  const path = roads[ref.road]!;
  if (dist(info.pt, path.nodes[ref.node]!) < 6 / info.scale) return roads;
  const next = replaceRoad(roads, ref.road, dragHeading(path, ref.node, info.pt, info.shift));
  return syncHeadings(next, ref.road, path);
}

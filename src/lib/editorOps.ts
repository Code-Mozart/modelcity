import { applyDrag, dragHeading } from './curves/drag';
import { closeOver, syncHeadings } from './curves/junctions';
import { appendNode, insertNode, prependNode, withNode, clearShapes } from './curves/path';
import {
  moveNodes,
  replaceRoad,
  startRoad,
  type NodeRef,
  type RoadHit,
  type Roads,
} from './curves/roads';
import { LANE_WIDTH_M } from './curves/lane';
import { snapParallel } from './curves/snap';
import { dist, type Vec } from './curves/vec';
import { withSharedRadius } from './editorPress';
import type { Drawn } from './editorTargets';
import type { Placement, PointerInfo, Press } from './editorTypes';

/** How near (screen pixels) the pointer must be to the line beside another lane to snap to it (^22). */
export const SNAP_PX = 14;

/** The node of the road being drawn that the next node attaches to, if any. */
function lastNode(d: Drawn): Vec | null {
  const nodes = d.active === null ? undefined : d.roads[d.active]?.nodes;
  return (d.end === 'end' ? nodes?.at(-1) : nodes?.[0]) ?? null;
}

/** The way the new lane travels: from the node it attaches to to the pointer, or backwards. */
function travelOf(d: Drawn, pt: Vec): Vec | null {
  const from = lastNode(d);
  if (!from) return null;
  const v = { x: pt.x - from.x, y: pt.y - from.y };
  return d.end === 'end' ? v : { x: -v.x, y: -v.y };
}

/**
 * How near (meters) the pointer must be to a curve to count as on it: the half width of the
 * road, but at least 6 and at most 18 screen pixels, so that the line a lane width beside it, where
 * a new lane snaps (^22), can still be reached when zoomed out.
 */
export const curveReach = (scale: number) =>
  Math.min(18, Math.max(6, (LANE_WIDTH_M / 2) * scale)) / scale;

/** Where a click at `pt` would place a node: snapped beside a lane if one is near. */
export function placementAt(d: Drawn, pt: Vec, scale: number): Placement {
  const snap = snapParallel(d.roads, pt, {
    reach: SNAP_PX / scale,
    exclude: d.active,
    travel: travelOf(d, pt),
  });
  return snap ? { pt: snap.pt, th: snap.th } : { pt, th: null };
}

const withHeading = (roads: Roads, ref: NodeRef, th: number | null): Roads => {
  if (th === null) return roads;
  const path = clearShapes(withNode(roads[ref.road]!, ref.node, { th }), [ref.node - 1, ref.node]);
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
 * The roads after dragging the grabbed handle to the pointer: a single node snaps beside another
 * lane, a group moves along, a radius is shared, shared nodes keep one heading (^22, ^23, ^71, ^77).
 */
export function dragStep(d: Drawn, press: Extract<Press, { kind: 'drag' }>, info: PointerInfo) {
  const { road } = press;
  const { handle } = press.drag;
  const alone = handle.type === 'node' && !press.group.length;
  const snap = alone
    ? snapParallel(d.roads, info.pt, { reach: SNAP_PX / info.scale, exclude: road })
    : null;
  const before = d.roads[road]!;
  const dragged = applyDrag(before, press.drag, snap?.pt ?? info.pt, { snap: info.shift });
  const path = snap
    ? clearShapes(withNode(dragged, handle.i, { th: snap.th }), [handle.i - 1, handle.i])
    : dragged;
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

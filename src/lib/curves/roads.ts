import {
  edgesOf,
  nearestOnCurve,
  releaseMiddles,
  removeNode,
  withNode,
  type CurveHit,
  type EdgeRef,
  type Path,
} from './path';
import { handlesOf, type Handle } from './handles';
import type { Vec } from './vec';

/**
 * The document is a list of independent roads, each one a chain of nodes like the demo's path
 * (^40, ^42). All functions are pure: they return new lists.
 */
export type Roads = Path[];

/** A node of a road. */
export interface NodeRef {
  road: number;
  node: number;
}

/** A handle together with the road it belongs to. */
export interface RoadHandle extends Handle {
  road: number;
}

export const edgesOfRoads = (roads: Roads): EdgeRef[][] => roads.map(edgesOf);

export function roadHandles(roads: Roads, edges: EdgeRef[][], scale: number): RoadHandle[] {
  return roads.flatMap((path, road) =>
    handlesOf(path, edges[road] ?? [], scale).map((h) => ({ ...h, road })),
  );
}

export const replaceRoad = (roads: Roads, road: number, path: Path): Roads =>
  roads.map((r, i) => (i === road ? path : r));

/** A new road consisting of one node at `pt`, heading east (to the right). */
export function startRoad(roads: Roads, pt: Vec): { roads: Roads; road: number } {
  const road: Path = { nodes: [{ x: pt.x, y: pt.y, th: 0 }], radii: [], shapes: [] };
  return { roads: [...roads, road], road: roads.length };
}

export interface RoadHit extends CurveHit {
  road: number;
}

/** The point of any road nearest to `pt`, if within `maxDist` meters. */
export function nearestOnRoads(roads: Roads, pt: Vec, maxDist: number): RoadHit | null {
  let best: RoadHit | null = null;
  roads.forEach((path, road) => {
    const hit = nearestOnCurve(path, pt, maxDist);
    if (hit && (!best || hit.d < best.d)) best = { ...hit, road };
  });
  return best;
}

/** Remove a whole road; `active` and indices above it shift down. */
export function removeRoad(roads: Roads, road: number, active: number | null) {
  const next = active === road ? null : active !== null && active > road ? active - 1 : active;
  return { roads: roads.filter((_, i) => i !== road), active: next };
}

/**
 * Remove nodes of one road. A road needs two nodes, so one that would be left with fewer is
 * removed entirely, unless it is the road being drawn (it may have one node while drawing).
 */
export function removeNodesOfRoad(
  roads: Roads,
  road: number,
  nodes: number[],
  active: number | null,
) {
  const path = roads[road];
  if (!path) return { roads, active };
  const left = [...nodes].sort((a, b) => b - a).reduce(removeNode, path);
  const tooShort = left.nodes.length < 2 && !(road === active && left.nodes.length === 1);
  if (tooShort) return removeRoad(roads, road, active);
  return { roads: replaceRoad(roads, road, left), active };
}

export const removeNodeFrom = (roads: Roads, ref: NodeRef, active: number | null) =>
  removeNodesOfRoad(roads, ref.road, [ref.node], active);

/** Remove any nodes, road by road (highest road first, so the indices of the others stay valid). */
export function removeNodesFrom(roads: Roads, refs: NodeRef[], active: number | null) {
  const byRoad = [...new Set(refs.map((r) => r.road))].sort((a, b) => b - a);
  return byRoad.reduce(
    (s, road) =>
      removeNodesOfRoad(
        s.roads,
        road,
        refs.filter((r) => r.road === road).map((r) => r.node),
        s.active,
      ),
    { roads, active },
  );
}

/** A node with its position at some moment: what a group move starts from. */
export interface Placed extends NodeRef {
  x: number;
  y: number;
}

export function placed(roads: Roads, refs: NodeRef[]): Placed[] {
  return refs.flatMap((r) => {
    const n = roads[r.road]?.nodes[r.node];
    return n ? [{ ...r, x: n.x, y: n.y }] : [];
  });
}

/**
 * Move nodes (possibly of several roads) by the same translation from where they were (^71).
 * Headings stay; the fixed middle line of an S-curve next to a moved node is released.
 */
export function moveNodes(roads: Roads, group: Placed[], delta: Vec): Roads {
  return roads.map((path, road) => {
    const mine = group.filter((g) => g.road === road);
    if (!mine.length) return path;
    const moved = mine.reduce(
      (p, g) => withNode(p, g.node, { x: g.x + delta.x, y: g.y + delta.y }),
      path,
    );
    return releaseMiddles(
      moved,
      mine.flatMap((g) => [g.node - 1, g.node]),
    );
  });
}

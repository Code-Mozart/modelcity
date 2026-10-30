import {
  edgesOf,
  nearestOnCurve,
  removeNode,
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
 * Remove a node. A road needs two nodes, so one that would be left with fewer is removed
 * entirely, unless it is the road being drawn (it may have one node while drawing).
 */
export function removeNodeFrom(roads: Roads, ref: NodeRef, active: number | null) {
  const path = roads[ref.road];
  if (!path) return { roads, active };
  const left = removeNode(path, ref.node);
  const tooShort = left.nodes.length < 2 && !(ref.road === active && left.nodes.length === 1);
  if (tooShort) return removeRoad(roads, ref.road, active);
  return { roads: replaceRoad(roads, ref.road, left), active };
}

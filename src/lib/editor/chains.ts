import type { Edge } from '../curves/edge';
import { buildEdge } from '../curves/edge';
import { handlesOf, type Handle } from '../curves/handles';
import type { CurveHit, EdgeRef, Path } from '../curves/path';
import { nearestOnEdges } from '../curves/path';
import { pointOn, type Sample } from '../curves/piece';
import type { PathNode } from '../curves/types';
import { RMIN } from '../curves/radius';
import { dist } from '../curves/vec';
import { DEFAULT_LANE, nodeOf, widthOf, type GEdge, type GNode, type Graph } from '../model/graph';

/**
 * Chains are derived from the graph for drawing and hit testing (^106): maximal runs of edges that
 * follow each other (the end of one is the start of the next) through nodes with exactly one edge
 * in and one out. Every edge is in exactly one chain; a node where chains meet is in several. A
 * chain is a `Path` for the curve code, plus the ids behind its indices.
 */
export interface Chain {
  path: Path;
  /** Edge `i` of the chain, as the curve code sees it (`EdgeRef.i` is the index in the chain). */
  edges: EdgeRef[];
  nodeIds: number[];
  edgeIds: number[];
  /** Lane width in meters (of the first edge). */
  width: number;
}

interface Geo {
  p: GNode;
  q: GNode;
  E: Edge;
}

const geoCache = new WeakMap<GEdge, Geo>();

/** The curve of an edge, kept while the edge and its two nodes stay the same objects. */
function geoOf(e: GEdge, p: GNode, q: GNode): Geo {
  const cached = geoCache.get(e);
  if (cached && cached.p === p && cached.q === q) return cached;
  const geo = { p, q, E: buildEdge(p, q, e.radius) };
  geoCache.set(e, geo);
  return geo;
}

function through(inCount: Map<number, number>, outCount: Map<number, number>, node: number) {
  return inCount.get(node) === 1 && outCount.get(node) === 1;
}

function buildChains(g: Graph): Chain[] {
  const count = (key: 'start' | 'end') => {
    const m = new Map<number, number>();
    for (const e of g.edges) m.set(e[key], (m.get(e[key]) ?? 0) + 1);
    return m;
  };
  const [outCount, inCount] = [count('start'), count('end')];
  const next = new Map(g.edges.map((e) => [e.start, e]));
  const seen = new Set<number>();
  const run = (first: GEdge): GEdge[] => {
    const list = [first];
    seen.add(first.id);
    let e = first;
    while (through(inCount, outCount, e.end)) {
      const n = next.get(e.end);
      if (!n || seen.has(n.id)) break;
      seen.add(n.id);
      list.push(n);
      e = n;
    }
    return list;
  };
  const starts = g.edges.filter((e) => !through(inCount, outCount, e.start));
  const runs: GEdge[][] = [];
  for (const e of [...starts, ...g.edges]) if (!seen.has(e.id)) runs.push(run(e));
  const lone = g.nodes.filter((n) => !inCount.has(n.id) && !outCount.has(n.id));
  return [...runs.map((r) => toChain(g, r)), ...lone.map((n) => loneChain(g, n))];
}

/** A node without any edge (the first node of a road being drawn) is a chain of its own. */
function loneChain(g: Graph, n: GNode): Chain {
  const width = g.lanes[DEFAULT_LANE]?.width ?? 0;
  return { path: { nodes: [n], radii: [] }, edges: [], nodeIds: [n.id], edgeIds: [], width };
}

function toChain(g: Graph, list: GEdge[]): Chain {
  const edges = list.map((e, i): EdgeRef => {
    const geo = geoOf(e, nodeOf(g, e.start)!, nodeOf(g, e.end)!);
    return { i, p: geo.p, q: geo.q, E: geo.E };
  });
  const nodes = [edges[0]!.p, ...edges.map((r) => r.q)] as GNode[];
  return {
    path: { nodes, radii: list.map((e) => e.radius) },
    edges,
    nodeIds: nodes.map((n) => n.id),
    edgeIds: list.map((e) => e.id),
    width: widthOf(g, list[0]!),
  };
}

const cache = new WeakMap<Graph, Chain[]>();

export function chainsOf(g: Graph): Chain[] {
  let chains = cache.get(g);
  if (!chains) cache.set(g, (chains = buildChains(g)));
  return chains;
}

/** The node a point of a curve would become: its position and the heading of the curve there. */
export const nodeAtSample = (at: Sample): PathNode => ({
  x: at.x,
  y: at.y,
  th: Math.atan2(at.ty, at.tx),
});

/** A curve hit together with the chain and the edge it is on. */
export interface RoadHit extends CurveHit {
  road: number;
  edge: number;
}

/** The point of any chain nearest to `pt`, if within `maxDist` meters. */
export function nearestOnChains(chains: Chain[], pt: { x: number; y: number }, maxDist: number) {
  let best: RoadHit | null = null;
  chains.forEach((c, road) => {
    const hit = nearestOnEdges(c.edges, pt, maxDist);
    if (hit && (!best || hit.d < best.d)) best = { ...hit, road, edge: c.edgeIds[hit.ref.i]! };
  });
  return best as RoadHit | null;
}

/** A handle together with the chain it is drawn on and the id of its node (node and heading handles) or edge. */
export interface RoadHandle extends Handle {
  road: number;
  id: number;
}

/** All handles of all chains; a node where chains meet has one of each per chain, with the same id. */
export function chainHandles(chains: Chain[], scale: number): RoadHandle[] {
  return chains.flatMap((c, road) =>
    handlesOf(c.path, c.edges, scale).map((h) => ({
      ...h,
      road,
      id: h.type === 'node' || h.type === 'head' ? c.nodeIds[h.i]! : c.edgeIds[h.i]!,
    })),
  );
}

/** The first place a node is drawn on a chain: the chain and the index in it. */
export function positionOf(chains: Chain[], id: number): { road: number; node: number } | null {
  for (let road = 0; road < chains.length; road++) {
    const node = chains[road]!.nodeIds.indexOf(id);
    if (node >= 0) return { road, node };
  }
  return null;
}

/**
 * Closer than this (meters) to a node, a point on a curve is not a place for a new node (^137): the
 * smallest radius (a shorter edge could not be curved).
 */
const MIN_NODE_GAP_M = RMIN;

export const nearNode = (hit: CurveHit) =>
  dist(hit.at, hit.ref.p) < MIN_NODE_GAP_M || dist(hit.at, hit.ref.q) < MIN_NODE_GAP_M;

/** The chain positions (chain, index) of the given edges, for the drawing code. */
export function chainSegments(chains: Chain[], edgeIds: number[]): { road: number; i: number }[] {
  return chains.flatMap((c, road) =>
    c.edgeIds.flatMap((id, i) => (edgeIds.includes(id) ? [{ road, i }] : [])),
  );
}

/** The selected nodes as chain positions: every place a node is drawn (a shared node is drawn on several chains). */
export function chainSelection(chains: Chain[], ids: number[]): { road: number; node: number }[] {
  return chains.flatMap((c, road) =>
    c.nodeIds.flatMap((id, node) => (ids.includes(id) ? [{ road, node }] : [])),
  );
}

/** The point of a curve a radius point sits on, as a curve hit: what a click on the point splits or merges at (^278). */
export function hitOfHandle(chains: Chain[], h: RoadHandle): RoadHit | null {
  const ref = chains[h.road]?.edges[h.i];
  const piece = ref?.E.pieces[h.k ?? 0];
  return ref && piece
    ? { ref, k: h.k ?? 0, at: pointOn(piece, h.t ?? 0.5), d: 0, road: h.road, edge: h.id }
    : null;
}

const curves = new WeakMap<Graph, Map<number, Edge>>();

/** The curve of a segment as the curve code builds it, if the graph has it (^106). */
export function curveOfEdge(g: Graph, edge: number): Edge | undefined {
  let index = curves.get(g);
  if (!index) {
    index = new Map(
      chainsOf(g).flatMap((c) => c.edges.map((r, i) => [c.edgeIds[i]!, r.E] as const)),
    );
    curves.set(g, index);
  }
  return index.get(edge);
}

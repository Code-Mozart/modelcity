import { buildEdge } from '../curves/edge';
import type { EdgeRef } from '../curves/path';
import type { Edge } from '../curves/edge';
import { DEFAULT_LANE, nodeOf, widthOf, type GEdge, type GNode, type Graph } from '../model/graph';
import type { Chain } from './chains';

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

export function buildChains(g: Graph): Chain[] {
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
export function loneChain(g: Graph, n: GNode): Chain {
  const width = g.lanes[DEFAULT_LANE]?.width ?? 0;
  return { path: { nodes: [n], radii: [] }, edges: [], nodeIds: [n.id], edgeIds: [], width };
}

export function toChain(g: Graph, list: GEdge[]): Chain {
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

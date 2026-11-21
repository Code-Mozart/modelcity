import { buildEdge } from '../curves/edge';
import type { Edge } from '../curves/types';
import { edgeOfId, nodeOf, type GEdge, type Graph } from '../model/graph';

const kept = new WeakMap<GEdge, { p: object; q: object; E: Edge }>();

/**
 * The curve of a segment of a graph, made from its two nodes and its radius alone (^172; the
 * rewrite has no S-curves made parallel to their neighbours yet, ^1266), kept while the segment and
 * its nodes are the same objects.
 */
export function curveOfEdge(g: Graph, edge: number): Edge | undefined {
  const e = edgeOfId(g, edge);
  return e && curveOfOne(g, e);
}

function curveOfOne(g: Graph, e: GEdge): Edge | undefined {
  const [p, q] = [nodeOf(g, e.start), nodeOf(g, e.end)];
  if (!p || !q) return undefined;
  const k = kept.get(e);
  if (k && k.p === p && k.q === q) return k.E;
  const E = buildEdge(p, q, e.radius);
  kept.set(e, { p, q, E });
  return E;
}

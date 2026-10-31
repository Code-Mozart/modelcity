import { closeOver, coincident } from './junctions';
import type { NodeRef, Roads } from './roads';

/**
 * Branches (^128): a chain of nodes without splits or merges. Its first and last node have a
 * number of edges other than two, all nodes between have exactly two. Nodes of different roads at
 * the same position are one node (^92), so a branch can run through several of them.
 */
export interface EdgeKey {
  road: number;
  i: number;
}

const sameEdge = (a: EdgeKey, b: EdgeKey) => a.road === b.road && a.i === b.i;

/** The edges that meet at a node: those of all nodes it is, each once. */
function edgesAt(roads: Roads, ref: NodeRef): EdgeKey[] {
  const edges: EdgeKey[] = [];
  for (const c of coincident(roads, ref)) {
    const last = (roads[c.road]?.nodes.length ?? 0) - 1;
    if (c.node > 0) edges.push({ road: c.road, i: c.node - 1 });
    if (c.node < last) edges.push({ road: c.road, i: c.node });
  }
  return edges;
}

/** Walk on from `at` (an end node of `edge`) through nodes with two edges; the edges passed. */
function walk(roads: Roads, edge: EdgeKey, at: NodeRef, seen: EdgeKey[]): void {
  let current = edge;
  let node = at;
  for (;;) {
    const here = edgesAt(roads, node);
    if (here.length !== 2) return;
    const next = here.find((e) => !sameEdge(e, current));
    if (!next || seen.some((s) => sameEdge(s, next))) return;
    seen.push(next);
    current = next;
    // the far node of the next edge is the one that is not this node
    const a = { road: next.road, node: next.i };
    const b = { road: next.road, node: next.i + 1 };
    node = coincident(roads, node).some((c) => c.road === a.road && c.node === a.node) ? b : a;
  }
}

/** The branch an edge belongs to: all its nodes, first and last included, and the nodes they are shared with. */
export function branchOfEdge(roads: Roads, edge: EdgeKey): NodeRef[] {
  const seen: EdgeKey[] = [edge];
  walk(roads, edge, { road: edge.road, node: edge.i }, seen);
  walk(roads, edge, { road: edge.road, node: edge.i + 1 }, seen);
  const nodes = seen.flatMap((e) => [
    { road: e.road, node: e.i },
    { road: e.road, node: e.i + 1 },
  ]);
  return closeOver(roads, nodes);
}

/**
 * The branch of a node: for a node between the ends of a branch the one it is on; for a node where
 * branches meet or end, the branch that goes on from it in the direction the road was drawn, else
 * the one before it (assumed).
 */
export function branchOfNode(roads: Roads, ref: NodeRef): NodeRef[] {
  const last = (roads[ref.road]?.nodes.length ?? 0) - 1;
  if (last < 1) return closeOver(roads, [ref]);
  const edge =
    ref.node < last ? { road: ref.road, i: ref.node } : { road: ref.road, i: ref.node - 1 };
  return branchOfEdge(roads, edge);
}

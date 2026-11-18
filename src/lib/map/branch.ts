import type { EdgeRow } from '../project/storage';

/** What a branch is found in (^1258): the loaded segments at a node, and whether all of a node's segments can be there. */
export interface Network {
  edgesAt(node: number): EdgeRow[];
  /** The chunk that the node is in is loaded: so all the segments that touch the node are (a segment's box touches the chunk of both its nodes, ^1239). Of any other node more segments may exist than are known. */
  complete(node: number): boolean;
}

/** A branch (^128, ^130): a chain of nodes without splits or merges; its first and last node have a number of segments other than two, all nodes between have exactly two. */
export interface Branch {
  nodes: number[];
  edges: number[];
  /** False when the walk stopped at a node whose segments are not all known: the branch may go on beyond what is loaded (^1258). */
  complete: boolean;
}

const other = (e: EdgeRow, id: number) => (e[1] === id ? e[2] : e[1]);

/** The nodes and segments reached from `cur` by going on, away from the segment `via`, through nodes with exactly two segments. */
function walk(net: Network, from: { cur: number; via: number }, seen: Set<number>, out: Branch) {
  let { cur, via } = from;
  for (;;) {
    if (!net.complete(cur)) {
      out.complete = false;
      return;
    }
    const here = net.edgesAt(cur);
    if (here.length !== 2) return;
    const next = here.find((e) => e[0] !== via)!;
    out.edges.push(next[0]);
    [cur, via] = [other(next, cur), next[0]];
    if (seen.has(cur)) return;
    seen.add(cur);
    out.nodes.push(cur);
  }
}

/** The branch a segment is on: its nodes, ends included. */
export function branchOfEdge(net: Network, edge: EdgeRow): Branch {
  const seen = new Set([edge[1], edge[2]]);
  const out: Branch = { nodes: [edge[1], edge[2]], edges: [edge[0]], complete: true };
  for (const cur of [edge[1], edge[2]]) walk(net, { cur, via: edge[0] }, seen, out);
  return out;
}

/**
 * The branch of a node: for a node between the ends of a branch the one it is on; for a node where
 * branches meet or end, the branch that goes on from it in the direction the road was drawn, else
 * the one before it (assumed, as on `main`); a node with no segment is a branch of its own.
 */
export function branchOfNode(net: Network, id: number): Branch {
  const here = net.edgesAt(id);
  const edge =
    here.length === 2 ? here[0] : (here.find((e) => e[1] === id) ?? here.find((e) => e[2] === id));
  return edge ? branchOfEdge(net, edge) : { nodes: [id], edges: [], complete: net.complete(id) };
}

import type { EdgeRow, NodeRow } from '../project/storage';

/**
 * What `main` does when something is removed from the map (`model/graph.ts` removeNode and
 * removeNodes, ^322, ^434; `editor/ops.ts` removeSegmentsFrom, ^160; `model/junction.ts` branchOfEdge
 * and `editor/selection.ts` branchEdges, ^128): copied over to rows, written the way `main` wrote it,
 * and used as the reference that the new way is tested against. Do not make it clever.
 */
export interface Rows {
  nodes: NodeRow[];
  edges: EdgeRow[];
}

/** Take the nodes that no segment is at away, except `keep` (main's removeNodes, its second half). */
function unused({ nodes, edges }: Rows, keep: number | null): Rows {
  const used = new Set(edges.flatMap((e) => [e[1], e[2]]));
  return { nodes: nodes.filter((n) => used.has(n[0]) || n[0] === keep), edges };
}

function removeNode({ nodes, edges }: Rows, id: number): Rows {
  const [inE, outE] = [edges.filter((e) => e[2] === id), edges.filter((e) => e[1] === id)];
  const rest = edges.filter((e) => e[1] !== id && e[2] !== id);
  const join =
    inE.length === 1 &&
    outE.length === 1 &&
    inE[0]![1] !== id &&
    outE[0]![2] !== id &&
    inE[0]![1] !== outE[0]![2];
  const joined: EdgeRow[] = join ? [[inE[0]![0], inE[0]![1], outE[0]![2], null, inE[0]![4]]] : [];
  return { nodes: nodes.filter((n) => n[0] !== id), edges: [...rest, ...joined] };
}

export const removeNodesRef = (rows: Rows, ids: number[], keep: number | null = null): Rows =>
  unused(ids.reduce(removeNode, rows), keep);

export const removeSegmentsRef = (rows: Rows, ids: number[]): Rows =>
  unused({ nodes: rows.nodes, edges: rows.edges.filter((e) => !ids.includes(e[0])) }, null);

/** The segments between the nodes of the branch a segment is on (main's branchOfEdge and branchEdges). */
export function branchEdgesRef({ edges }: Rows, edgeId: number): number[] {
  const first = edges.find((e) => e[0] === edgeId);
  if (!first) return [];
  const at = (n: number) => edges.filter((e) => e[1] === n || e[2] === n);
  const nodes = new Set([first[1], first[2]]);
  for (const from of [first[1], first[2]]) {
    let [cur, via] = [from, first];
    for (let here = at(cur); here.length === 2; here = at(cur)) {
      const next = here.find((e) => e[0] !== via[0])!;
      [cur, via] = [next[1] === cur ? next[2] : next[1], next];
      if (nodes.has(cur)) break;
      nodes.add(cur);
    }
  }
  return edges.filter((e) => nodes.has(e[1]) && nodes.has(e[2])).map((e) => e[0]);
}

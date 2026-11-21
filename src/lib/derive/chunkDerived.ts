import type { Chunk } from '../map/chunkLoader';
import { chunkId, chunkOf, rangeOfIds } from '../map/chunks';
import type { EdgeRow, NodeRow } from '../project/storage';
import { graphOfRows } from '../edit/graphPiece';
import { derivedNodes, type DerivedNode } from './derivedNodes';

/** The chunk and the eight round it: what the derived nodes of a chunk are made from. */
export function neighbourhood(id: string): string[] {
  const { cx0: cx, cy0: cy } = rangeOfIds([id]);
  const out: string[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) out.push(chunkId(cx + dx, cy + dy));
  return out;
}

/** The rows of some chunks, each once: their nodes, the far ends of their segments, and the segments. */
export function rowsOf(chunks: readonly Chunk[]): { nodes: NodeRow[]; edges: EdgeRow[] } {
  const nodes = new Map<number, NodeRow>();
  const edges = new Map<number, EdgeRow>();
  for (const c of chunks) {
    c.nodes.forEach((n) => nodes.set(n[0], n));
    c.ends.forEach((n) => nodes.set(n[0], n));
    c.edges.forEach((e) => edges.set(e[0], e));
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

/**
 * The derived nodes in a chunk (^822, ^823, ^858, ^1268), made from the rows of the chunk and the
 * eight round it: a derived node is reached from a real node by at most `MAX_ROUNDS` touches of a
 * lane width each (a few tens of meters), so what is farther than a chunk cannot make one in it.
 * The derived nodes of the whole map, made from all of it (`derivedNodes`), are the specification:
 * a test compares the two.
 */
export function derivedInChunk(id: string, around: readonly Chunk[]): DerivedNode[] {
  const { nodes, edges } = rowsOf(around);
  const g = graphOfRows(nodes, edges, { node: 0, edge: 0 });
  return derivedNodes(g).filter((d) => chunkId(...chunkOf(d.x, d.y)) === id);
}

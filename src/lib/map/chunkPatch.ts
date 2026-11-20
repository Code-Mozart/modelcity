import type { EdgeRow, IndexChange, MapChange, NodeRow } from '../project/storage';
import type { Chunk } from './chunkLoader';
import { chunkId } from './chunks';

/**
 * What a written change does to the chunks in memory (^1260, ^1262): the rows as they are after it,
 * with the chunks each belongs in (a node in the chunk of its cell, a segment in every chunk its
 * record lists), and the nodes the change knows (changed and read round it), which are the far
 * ends a chunk may need. Made from what was written, so the chunks need not be read again.
 */
export interface ChunkPatch {
  /** Changed nodes: the row after, or null for one that is gone. */
  nodes: Map<number, { row: NodeRow; chunk: string } | null>;
  /** Changed segments: the row after with its chunks (`'wide'`: all of them), or null for one that is gone. */
  edges: Map<number, { row: EdgeRow; chunks: Set<string> | 'wide' } | null>;
  /** Nodes as they are after the change: the changed ones and those read round them. */
  known: Map<number, NodeRow>;
}

/** The patch of a change as it was written: its rows, what it did to the index, and the nodes read round it. */
export function patchOf(map: MapChange, index: IndexChange, context: NodeRow[]): ChunkPatch {
  const nodes: ChunkPatch['nodes'] = new Map();
  const edges: ChunkPatch['edges'] = new Map();
  const known = new Map(context.map((n) => [n[0], n]));
  for (const id of map.removedNodes) nodes.set(id, null);
  for (const id of map.removedEdges) edges.set(id, null);
  for (const { node, cell } of index.cells) {
    nodes.set(node[0], { row: node, chunk: chunkId(...cell) });
    known.set(node[0], node);
  }
  const rows = new Map(map.edges.map((e) => [e[0], e]));
  for (const r of index.records) {
    const row = rows.get(r.id);
    if (!row) throw new Error(`segment ${r.id} has a record but no row`);
    const chunks = r.cells === 'wide' ? 'wide' : new Set(r.cells.map(([x, y]) => chunkId(x, y)));
    edges.set(r.id, { row, chunks });
  }
  return { nodes, edges, known };
}

const has = (chunks: Set<string> | 'wide', id: string) => chunks === 'wide' || chunks.has(id);

/**
 * A chunk as it is after the change, as a read of it would give it now (the reading is the
 * specification; a test compares the two on random edits). Null when a far end that it needs is
 * not known here: then it has to be read again.
 */
export function patchChunk(c: Chunk, p: ChunkPatch): Chunk | null {
  const nodes = c.nodes.filter((n) => !p.nodes.has(n[0]));
  for (const after of p.nodes.values()) if (after && after.chunk === c.id) nodes.push(after.row);
  const edges = c.edges.filter((e) => !p.edges.has(e[0]));
  for (const after of p.edges.values()) if (after && has(after.chunks, c.id)) edges.push(after.row);
  const ends = endsOf(c, p, nodes, edges);
  return ends && { id: c.id, nodes, edges, ends };
}

/** The far ends the segments of the chunk need: the nodes as they are after the change, or as the chunk held them. Null if one is not known. */
function endsOf(c: Chunk, p: ChunkPatch, nodes: NodeRow[], edges: EdgeRow[]): NodeRow[] | null {
  const here = new Set(nodes.map((n) => n[0]));
  const before = new Map([...c.nodes, ...c.ends].map((n) => [n[0], n]));
  const ends = new Map<number, NodeRow>();
  const wanted = edges.flatMap((e) => [e[1], e[2]]).filter((id) => !here.has(id));
  for (const id of wanted) {
    const row = p.known.get(id) ?? (p.nodes.has(id) ? undefined : before.get(id));
    if (!row) return null;
    ends.set(id, row);
  }
  return [...ends.values()];
}

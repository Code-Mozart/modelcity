import type { EdgeRow, NodeRow, ProjectStorage } from '../project/storage';
import { rangeOfIds } from './chunks';
import { INDEX_VERSION } from './segmentIndex';

/** What is known of one chunk: its nodes (those whose position is in its cell) and every segment whose box touches it. */
export interface Chunk {
  id: string;
  nodes: NodeRow[];
  edges: EdgeRow[];
  /** The nodes at the far ends of those segments that are not in this chunk. */
  ends: NodeRow[];
}

/** How a read of a chunk goes: how far it is (0 to 1), and stopping it. */
export interface ChunkRead {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** How far a read is when its nodes and segments are there: the nodes at the far ends are the rest. */
const NODES_AND_EDGES_DONE = 0.7;

/**
 * Reads one chunk of the open project from the storage (^1231, ^1241): its nodes and the segments
 * that the index lists for it (every segment whose box touches the chunk, also one that only
 * crosses it, ^1239), each with one exact lookup of the chunk and both at the same time (each
 * request waits for the storage, ^1249), and then the nodes at the ends of those segments that are
 * not in the chunk. The index has to be complete (`isComplete`): a project without one is not read.
 * How far it is says which of these are done.
 */
export class ChunkLoader {
  constructor(
    private storage: ProjectStorage,
    private project: string,
  ) {}

  async load(id: string, { onProgress, signal }: ChunkRead = {}): Promise<Chunk> {
    const { cx0: cx, cy0: cy } = rangeOfIds([id]);
    signal?.throwIfAborted();
    const [nodes, edges] = await Promise.all([
      this.storage.nodesInChunk(this.project, cx, cy, INDEX_VERSION),
      this.storage.edgesInChunk(this.project, cx, cy, INDEX_VERSION),
    ]);
    onProgress?.(NODES_AND_EDGES_DONE);
    signal?.throwIfAborted();
    const here = new Set(nodes.map((n) => n[0]));
    const away = new Set<number>();
    for (const e of edges) for (const end of [e[1], e[2]]) if (!here.has(end)) away.add(end);
    const ends = away.size ? await this.storage.nodesByIds(this.project, [...away]) : [];
    onProgress?.(1);
    return { id, nodes, edges, ends };
  }
}

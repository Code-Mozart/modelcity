import type { EdgeRow, NodeRow, ProjectStorage, ReadOptions } from '../project/storage';
import { boxOfId, rangeOfIds } from './chunks';
import { INDEX_VERSION } from './segmentIndex';

/** What is known of one chunk: its nodes (those whose position is in its cell) and every segment that has one of its nodes at an end. */
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

/** The share of the progress that the nodes have: the rows are counted, what comes after is a step each. */
const NODES_SHARE = 0.9;
const EDGES_DONE = 0.95;

const mm = (m: number) => Math.round(m * 1000);

/**
 * Reads one chunk of the open project from the storage (^1231, ^1241): its nodes (the index on x
 * or on y, ^1228, counted while they are read, so that the progress is real), the segments that the
 * segment index lists for it (every segment whose box touches the chunk, also one that only crosses
 * it, ^1239), and the nodes at their ends that are not in the chunk. The segment index has to be
 * complete (`isComplete`): a project without one is not read.
 */
export class ChunkLoader {
  constructor(
    private storage: ProjectStorage,
    private project: string,
  ) {}

  async load(id: string, { onProgress, signal }: ChunkRead = {}): Promise<Chunk> {
    const box = boxOfId(id);
    const read: ReadOptions = {
      signal,
      onProgress: (done, total) => onProgress?.(total ? (NODES_SHARE * done) / total : NODES_SHARE),
    };
    // The upper edge belongs to the next chunk (a cell holds its left and top edge).
    const nodes = await this.storage.nodesIn(
      this.project,
      { x0: mm(box.x0), x1: mm(box.x1) - 1, y0: mm(box.y0), y1: mm(box.y1) - 1 },
      read,
    );
    signal?.throwIfAborted();
    const { cx0, cy0 } = rangeOfIds([id]);
    const edges = await this.storage.edgesInChunk(this.project, cx0, cy0, INDEX_VERSION);
    onProgress?.(EDGES_DONE);
    signal?.throwIfAborted();
    const here = new Set(nodes.map((n) => n[0]));
    const away = new Set<number>();
    for (const e of edges) for (const end of [e[1], e[2]]) if (!here.has(end)) away.add(end);
    const ends = await this.storage.nodesByIds(this.project, [...away]);
    onProgress?.(1);
    return { id, nodes, edges, ends };
  }
}

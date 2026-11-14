import type { Box } from '../curves/hull';
import type { EdgeRow, NodeRow, ProjectStorage } from '../project/storage';
import { boxOfRange, chunkId, chunkOf, idsOf, rangeOfIds, type ChunkRange } from './chunks';

/** What is known of one chunk: its nodes (those whose position is in its cell) and every segment that has one of its nodes at an end. */
export interface Chunk {
  id: string;
  nodes: NodeRow[];
  edges: EdgeRow[];
}

/** What one request found: how many chunks were not there yet, and what was read for them. */
export interface Loaded {
  chunks: number;
  nodes: number;
  edges: number;
  /** Nodes outside the chunks that segments of these chunks end at. */
  ends: number;
}

const mm = (m: number) => Math.round(m * 1000);
const toMeters = (n: NodeRow): [number, number] => [n[1] / 1000, n[2] / 1000];

/**
 * Loads the chunks of the map that are asked for from the storage, and keeps them (^1231). Dry: it
 * only holds what it read, nothing is made from it yet. A chunk is read with one query for the
 * nodes in all of the chunks that are new (the index on x or on y, ^1228), one for the segments of
 * those nodes, and one for the nodes at their other ends. A segment that only crosses a chunk, with
 * both nodes outside it, is not found by this (^1229).
 */
export class ChunkLoader {
  readonly chunks = new Map<string, Chunk>();
  /** The chunks that are being read: a request for them is not made twice. */
  private reading = new Set<string>();
  /** Every node that was read, by id: the nodes of the chunks and the nodes at the far end of their segments. */
  private nodes = new Map<number, NodeRow>();

  constructor(
    private storage: ProjectStorage,
    private project: string,
  ) {}

  /** Whether a chunk is loaded. */
  has = (id: string) => this.chunks.has(id);

  /** Make sure the chunks of a range are loaded: the ones that are neither there nor being read are read, in one request for the box round them. */
  async load(range: ChunkRange): Promise<Loaded> {
    const fresh = new Set(
      [...idsOf(range)].filter((id) => !this.chunks.has(id) && !this.reading.has(id)),
    );
    const found: Loaded = { chunks: fresh.size, nodes: 0, edges: 0, ends: 0 };
    if (!fresh.size) return found;
    fresh.forEach((id) => this.reading.add(id));
    try {
      return await this.read(fresh, found);
    } finally {
      fresh.forEach((id) => this.reading.delete(id));
    }
  }

  private async read(fresh: Set<string>, found: Loaded): Promise<Loaded> {
    const box: Box = boxOfRange(rangeOfIds(fresh));
    const rows = await this.storage.nodesIn(this.project, {
      x0: mm(box.x0),
      x1: mm(box.x1 - 1e-3),
      y0: mm(box.y0),
      y1: mm(box.y1 - 1e-3),
    });
    const made = new Map([...fresh].map((id) => [id, { id, nodes: [], edges: [] } as Chunk]));
    for (const n of rows) {
      const chunk = made.get(chunkId(...chunkOf(...toMeters(n))));
      if (!chunk) continue;
      chunk.nodes.push(n);
      this.nodes.set(n[0], n);
      found.nodes++;
    }
    await this.attach(made, found);
    made.forEach((c, id) => this.chunks.set(id, c));
    return found;
  }

  /** Give each new chunk its segments, and read the nodes at their other ends. */
  private async attach(made: Map<string, Chunk>, found: Loaded) {
    const ids = [...made.values()].flatMap((c) => c.nodes.map((n) => n[0]));
    const edges = await this.storage.edgesOf(this.project, ids);
    const away = new Set<number>();
    for (const e of edges) for (const end of [e[1], e[2]]) if (!this.nodes.has(end)) away.add(end);
    const ends = await this.storage.nodesByIds(this.project, [...away]);
    ends.forEach((n) => this.nodes.set(n[0], n));
    found.ends = ends.length;
    for (const e of edges) {
      const places = new Set([e[1], e[2]].map((end) => this.chunkIdOf(end)));
      for (const place of places) {
        const chunk = place && made.get(place);
        if (!chunk) continue;
        chunk.edges.push(e);
        found.edges++;
      }
    }
  }

  private chunkIdOf(node: number) {
    const n = this.nodes.get(node);
    return n && chunkId(...chunkOf(...toMeters(n)));
  }
}

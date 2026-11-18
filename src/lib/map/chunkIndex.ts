import type { Chunk } from './chunkLoader';
import type { EdgeRow, NodeRow } from '../project/storage';

interface Held<R> {
  row: R;
  refs: number;
}

/**
 * The rows of the chunks that are loaded, by id (^1247): a node or a segment that several chunks
 * know (a segment between two chunks, a node at the far end of one) is one row, shared, and is let
 * go with the last chunk that has it. So a segment can be found by its id from its nodes, and is
 * drawn once.
 */
export class ChunkIndex {
  private nodes = new Map<number, Held<NodeRow>>();
  private edges = new Map<number, Held<EdgeRow>>();
  /** The segments that start or end at a node, of those that are loaded (^1258). */
  private at = new Map<number, Set<number>>();

  nodeOf = (id: number): NodeRow | undefined => this.nodes.get(id)?.row;

  /** The loaded segments that start or end at a node. */
  edgesAt = (node: number): EdgeRow[] =>
    [...(this.at.get(node) ?? [])]
      .map((id) => this.edges.get(id)?.row)
      .filter((row): row is EdgeRow => row !== undefined);

  get size() {
    return this.nodes.size + this.edges.size;
  }

  /** Count a chunk's rows, and give it the shared rows in place of its own where there are some. */
  add(chunk: Chunk) {
    chunk.nodes = chunk.nodes.map((r) => take(this.nodes, r));
    chunk.ends = chunk.ends.map((r) => take(this.nodes, r));
    chunk.edges = chunk.edges.map((r) => {
      const known = this.edges.has(r[0]);
      const row = take(this.edges, r);
      if (!known) for (const end of [r[1], r[2]]) this.touch(end, r[0], true);
      return row;
    });
  }

  private touch(node: number, edge: number, add: boolean) {
    const set = this.at.get(node) ?? new Set<number>();
    if (add) set.add(edge);
    else set.delete(edge);
    if (set.size) this.at.set(node, set);
    else this.at.delete(node);
  }

  /** Let go of a chunk's rows: those that no other chunk has are forgotten. */
  remove(chunk: Chunk) {
    chunk.nodes.forEach((r) => drop(this.nodes, r));
    chunk.ends.forEach((r) => drop(this.nodes, r));
    chunk.edges.forEach((r) => {
      drop(this.edges, r);
      if (!this.edges.has(r[0])) for (const end of [r[1], r[2]]) this.touch(end, r[0], false);
    });
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.at.clear();
  }
}

function take<R extends [number, ...unknown[]]>(rows: Map<number, Held<R>>, row: R): R {
  const held = rows.get(row[0]);
  if (held) {
    held.refs++;
    return held.row;
  }
  rows.set(row[0], { row, refs: 1 });
  return row;
}

function drop<R extends [number, ...unknown[]]>(rows: Map<number, Held<R>>, row: R) {
  const held = rows.get(row[0]);
  if (held && --held.refs <= 0) rows.delete(row[0]);
}

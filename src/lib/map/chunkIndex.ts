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

  nodeOf = (id: number): NodeRow | undefined => this.nodes.get(id)?.row;

  get size() {
    return this.nodes.size + this.edges.size;
  }

  /** Count a chunk's rows, and give it the shared rows in place of its own where there are some. */
  add(chunk: Chunk) {
    chunk.nodes = chunk.nodes.map((r) => take(this.nodes, r));
    chunk.ends = chunk.ends.map((r) => take(this.nodes, r));
    chunk.edges = chunk.edges.map((r) => take(this.edges, r));
  }

  /** Let go of a chunk's rows: those that no other chunk has are forgotten. */
  remove(chunk: Chunk) {
    chunk.nodes.forEach((r) => drop(this.nodes, r));
    chunk.ends.forEach((r) => drop(this.nodes, r));
    chunk.edges.forEach((r) => drop(this.edges, r));
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
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

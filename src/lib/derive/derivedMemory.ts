import type { Chunk } from '../map/chunkLoader';
import type { ChunkState } from '../map/mapMemory.svelte';
import { derivedInChunk, neighbourhood } from './chunkDerived';
import type { DerivedNode } from './derivedNodes';

interface Kept {
  /** The nine chunks it was made from, as they were. */
  from: Chunk[];
  derived: DerivedNode[];
}

/**
 * The derived nodes of the loaded chunks, kept per chunk (^1268): made when the chunk and the eight
 * round it are loaded, and made again only when one of those nine changed (a chunk that is read or
 * patched is a new object); what is kept for chunks that are let go is forgotten. Runtime data
 * per place (`CLAUDE.md`): what an operation could not have changed is not made again.
 */
export class DerivedMemory {
  private kept = new Map<string, Kept>();

  /** The derived nodes in a chunk, or null while it or one round it is not loaded. */
  of(id: string, chunks: ReadonlyMap<string, ChunkState>): DerivedNode[] | null {
    const from: Chunk[] = [];
    for (const n of neighbourhood(id)) {
      const s = chunks.get(n);
      if (s?.status !== 'ready') return null;
      from.push(s.chunk);
    }
    const k = this.kept.get(id);
    if (k && k.from.every((c, i) => c === from[i])) return k.derived;
    const derived = derivedInChunk(id, from);
    this.kept.set(id, { from, derived });
    if (this.kept.size > 2 * chunks.size + 16) this.forget(chunks);
    return derived;
  }

  /** Forget what was kept for chunks that are not loaded any more. */
  private forget(chunks: ReadonlyMap<string, ChunkState>) {
    for (const id of [...this.kept.keys()]) if (!chunks.has(id)) this.kept.delete(id);
  }
}

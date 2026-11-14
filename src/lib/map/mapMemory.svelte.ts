import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { ProjectStorage } from '../project/storage';
import { ChunkLoader, type Chunk } from './chunkLoader';
import { countOf, idsOf, type ChunkRange } from './chunks';

/** More chunks than this are not loaded: so much of the map at once needs a level of detail that is not built yet (^1238). */
export const MAX_CHUNKS = 400;

/**
 * The map in memory (^1238): the chunks of the open project that are loaded, and the ones that
 * were asked for and are on their way. `ready` and `loading` are reactive per chunk: what is drawn from one
 * chunk is drawn again when it arrives. A chunk that is not there yet does not
 * stop anything: the camera moves on, and the chunk is shown as not loaded until it arrives.
 */
export class MapMemory {
  /** The id of the open project, '' for none: read where chunks are asked for, so that they are asked for again when the project changes. */
  project = $state('');
  readonly ready = new SvelteMap<string, Chunk>();
  readonly loading = new SvelteSet<string>();
  /** More than `MAX_CHUNKS` were asked for. */
  tooMuch = $state(false);
  /** Milliseconds each read waits before it starts: for the tests that want to see a chunk that is not there yet. */
  latencyMs = 0;
  private loader: ChunkLoader | null = null;
  /** Counts the projects that were open: what a read of an earlier one finds is let go. */
  private generation = 0;

  constructor(private storage: ProjectStorage) {}

  /** The open project is another one (or none, ''): nothing of the earlier one is kept. */
  open(project: string) {
    this.generation++;
    this.project = project;
    this.loader = project ? new ChunkLoader(this.storage, project) : null;
    this.ready.clear();
    this.loading.clear();
    this.tooMuch = false;
  }

  /** Ask for the chunks of a range: those that are neither loaded nor on their way are read. */
  async show(range: ChunkRange) {
    const loader = this.loader;
    this.tooMuch = countOf(range) > MAX_CHUNKS;
    if (!loader || this.tooMuch) return;
    const fresh = [...idsOf(range)].filter((id) => !loader.has(id) && !this.loading.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => this.loading.add(id));
    const generation = this.generation;
    if (this.latencyMs) await new Promise((r) => setTimeout(r, this.latencyMs));
    if (generation !== this.generation) return;
    await loader.load(range);
    if (generation !== this.generation) return;
    for (const [id, chunk] of loader.chunks) {
      if (this.ready.get(id) !== chunk) this.ready.set(id, chunk);
      this.loading.delete(id);
    }
  }
}

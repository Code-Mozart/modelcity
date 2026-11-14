import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { ProjectStorage } from '../project/storage';
import { ChunkLoader, type Chunk } from './chunkLoader';
import { countOf, idsOf, rangeOfIds, type ChunkRange } from './chunks';

/** More chunks than this are not loaded: so much of the map at once needs a level of detail that is not built yet (^1238). */
export const MAX_CHUNKS = 400;
/** How many chunks are read at the same time. */
export const PARALLEL_READS = 4;
/** How many rows (nodes and segments) the chunks that are loaded may hold: provisional, to be set by measuring memory (^1246). */
export const ROW_BUDGET = 500_000;
/** What an eviction frees: the loaded chunks are let go down to this share of the budget, so that a chunk at the edge does not load and unload on every frame. */
export const EVICT_TO = 0.8;
/** What a chunk costs besides its rows (so that empty chunks count a little). */
const CHUNK_COST = 1;

/** A chunk that is on its way, with how far (0 to 1, real: rows read of rows there are), or there. */
export type ChunkState =
  { status: 'loading'; progress: number } | { status: 'ready'; chunk: Chunk };

const aborted = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/** Wait, unless the signal says to stop. */
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(timer), reject(signal.reason)), {
      once: true,
    });
  });

/**
 * The map in memory (^1238, ^1241): the chunks of the open project that are asked for, each on its
 * way or loaded. A chunk is read on its own, a few at a time, the one nearest the middle of the
 * view first; one that is no longer asked for is stopped. Nothing waits for them: the camera moves
 * on, and a chunk that is not there yet is shown as such. `chunks` is reactive per chunk.
 */
export class MapMemory {
  readonly chunks = new SvelteMap<string, ChunkState>();
  /** The id of the open project, '' for none: read where chunks are asked for, so that they are asked for again when the project changes. */
  project = $state('');
  /** More than `MAX_CHUNKS` were asked for. */
  tooMuch = $state(false);
  /** The rows that the loaded chunks may hold. */
  budgetRows = ROW_BUDGET;
  /** Milliseconds each read waits before it starts: for the tests that want to see a chunk that is not there yet. */
  latencyMs = 0;
  private loader: ChunkLoader | null = null;
  /** The chunks asked for now, those that wait for a turn (nearest first) and those being read. */
  private wanted = new SvelteSet<string>();
  private queue: string[] = [];
  private reading = new SvelteMap<string, AbortController>();
  /** When each chunk was last asked for (a count of the requests), for the order in which they are let go. */
  private lastWanted = new SvelteMap<string, number>();
  private requests = 0;
  /** Where the middle of the view was at the last request, in chunks. */
  private middle = { x: 0, y: 0 };
  /** The rows the loaded chunks hold now. */
  private rows = 0;
  /** Chunks that must stay whatever the budget says: those with changes that are not saved yet, those of selected and pinned nodes (^1246). */
  readonly pinned = new SvelteSet<string>();
  /** Counts the projects that were open: what a read of an earlier one finds is let go. */
  private generation = 0;

  constructor(private storage: ProjectStorage) {}

  /** The open project is another one (or none, ''): nothing of the earlier one is kept, and its reads are stopped. */
  open(project: string) {
    this.generation++;
    this.reading.forEach((r) => r.abort());
    this.reading.clear();
    this.wanted.clear();
    this.queue = [];
    this.project = project;
    this.loader = project ? new ChunkLoader(this.storage, project) : null;
    this.chunks.clear();
    this.lastWanted.clear();
    this.pinned.clear();
    this.rows = 0;
    this.tooMuch = false;
  }

  /** Ask for the chunks of a range, and no others: what is not there is read, what is on its way and no longer asked for is stopped. */
  show(range: ChunkRange) {
    this.tooMuch = countOf(range) > MAX_CHUNKS;
    if (!this.loader || this.tooMuch) return;
    this.wanted.clear();
    for (const id of idsOf(range)) this.wanted.add(id);
    for (const [id, state] of this.chunks) {
      if (state.status === 'loading' && !this.wanted.has(id)) this.drop(id);
    }
    this.middle = { x: (range.cx0 + range.cx1) / 2, y: (range.cy0 + range.cy1) / 2 };
    this.requests++;
    this.wanted.forEach((id) => this.lastWanted.set(id, this.requests));
    this.queue = [...this.wanted].filter((id) => !this.chunks.has(id) || this.waiting(id));
    this.queue.sort((a, b) => this.apart(a) - this.apart(b));
    this.queue.forEach(
      (id) => this.chunks.has(id) || this.chunks.set(id, { status: 'loading', progress: 0 }),
    );
    this.evict();
    this.pump();
  }

  /** How far a chunk is from the middle of the view, in chunks. */
  private apart(id: string) {
    const { cx0, cy0 } = rangeOfIds([id]);
    return Math.hypot(cx0 - this.middle.x, cy0 - this.middle.y);
  }

  private costOf = (c: Chunk) => c.nodes.length + c.edges.length + CHUNK_COST;

  /**
   * Over the budget: let go of loaded chunks that are not asked for and not pinned, the one asked
   * for longest ago first and, of those, the one farthest from the view (^1246), down to `EVICT_TO`
   * of the budget. If what is asked for alone is more than the budget, nothing more is asked for
   * and the view says so, as with too many chunks.
   */
  private evict() {
    if (this.rows <= this.budgetRows) return;
    const gone = [...this.chunks]
      .filter(([id, s]) => s.status === 'ready' && !this.wanted.has(id) && !this.pinned.has(id))
      .sort(
        ([a], [b]) =>
          (this.lastWanted.get(a) ?? 0) - (this.lastWanted.get(b) ?? 0) ||
          this.apart(b) - this.apart(a),
      );
    for (const [id, state] of gone) {
      if (this.rows <= this.budgetRows * EVICT_TO) break;
      if (state.status === 'ready') this.rows -= this.costOf(state.chunk);
      this.chunks.delete(id);
      this.lastWanted.delete(id);
    }
    this.tooMuch = this.rows > this.budgetRows;
    if (this.tooMuch) this.queue = [];
  }

  private waiting = (id: string) =>
    !this.reading.has(id) && this.chunks.get(id)?.status === 'loading';

  private drop(id: string) {
    this.reading.get(id)?.abort();
    this.reading.delete(id);
    this.chunks.delete(id);
  }

  private pump() {
    while (this.reading.size < PARALLEL_READS) {
      const id = this.queue.shift();
      if (id === undefined) return;
      if (this.wanted.has(id) && !this.reading.has(id)) void this.read(id);
    }
  }

  private async read(id: string) {
    const loader = this.loader!;
    const generation = this.generation;
    const control = new AbortController();
    this.reading.set(id, control);
    try {
      if (this.latencyMs) await wait(this.latencyMs, control.signal);
      const chunk = await loader.load(id, {
        signal: control.signal,
        onProgress: (progress) => generation === this.generation && this.progress(id, progress),
      });
      if (generation === this.generation && this.wanted.has(id)) {
        this.chunks.set(id, { status: 'ready', chunk });
        this.rows += this.costOf(chunk);
        this.evict();
      }
    } catch (e) {
      if (generation === this.generation && !aborted(e)) {
        console.error(`[modelcity] chunk ${id} could not be read`, e);
        this.chunks.delete(id);
      }
    } finally {
      if (generation === this.generation) {
        this.reading.delete(id);
        this.pump();
      }
    }
  }

  private progress(id: string, progress: number) {
    const state = this.chunks.get(id);
    if (state?.status === 'loading') this.chunks.set(id, { status: 'loading', progress });
  }
}

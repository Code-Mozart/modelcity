import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { ProjectStorage } from '../project/storage';
import { ChunkIndex } from './chunkIndex';
import { ChunkLoader, type Chunk } from './chunkLoader';
import type { Box } from '../curves/hull';
import type { LoadedMap } from './hit';
import { countOf, idsWhere, rangeOfIds, type ChunkRange } from './chunks';
import { patchChunk, type ChunkPatch } from './chunkPatch';

/** More chunks than this are not loaded: so much of the map at once needs a level of detail that is not built yet (^1238). */
export const MAX_CHUNKS = 400;
/** How many chunks are read at the same time. */
export const PARALLEL_READS = 12;
/** How many rows (nodes and segments) the chunks that are loaded may hold: provisional, to be set by measuring memory (^1246). */
export const ROW_BUDGET = 500_000;
/** What an eviction frees: the loaded chunks are let go down to this share of the budget, so that a chunk at the edge does not load and unload on every frame. */
export const EVICT_TO = 0.8;
/** How many reads are remembered (`reads`). */
const MAX_READS = 2000;
/** What a chunk costs besides its rows (so that empty chunks count a little). */
const CHUNK_COST = 1;

/** A chunk that is on its way, with how far (0 to 1, real: rows read of rows there are), or there. */
export type ChunkState = { status: 'loading' } | { status: 'ready'; chunk: Chunk };

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
  /** How far each chunk that is loading is, 0 to 1 (real: rows read of rows there are); apart from `chunks` so that what is drawn from the chunks is not made again at every step. */
  readonly progress = new SvelteMap<string, number>();
  /** The rows of the chunks that are loaded, shared (^1247). */
  readonly index = new ChunkIndex();
  /** The id of the open project, '' for none: read where chunks are asked for, so that they are asked for again when the project changes. */
  project = $state('');
  /** More than `MAX_CHUNKS` were asked for. */
  tooMuch = $state(false);
  /** The rows that the loaded chunks may hold. */
  budgetRows = ROW_BUDGET;
  /** How long the last reads took (`ms`) and how many rows they gave: for the benchmarks (`bench/`) and for a look at the console. */
  readonly reads: { id: string; ms: number; rows: number }[] = [];
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
  /** Said when the pinned chunks alone are more than the budget: nothing more can be let go, so the one who pinned them has to let them go (^1257). */
  onSqueezed: (() => void) | null = null;
  /** What was asked for last, so that it can be asked for again when a chunk has to be read afresh (^1260). */
  private last: { range: ChunkRange; near?: (box: Box) => boolean } | null = null;
  /** For each chunk the number of the last read afresh that was asked for: an older one that arrives later is let go. The numbers come from one counter that never goes back, so a number is never used twice, whatever is forgotten. */
  private fresh = new SvelteMap<string, number>();
  private reads_ = 0;
  /** Counts the projects that were open: what a read of an earlier one finds is let go. */
  private generation = 0;

  constructor(private storage: ProjectStorage) {}

  /** The map as it is loaded, for what is under the pointer and for the operations. */
  loaded(): LoadedMap {
    return {
      chunks: this.chunks,
      nodeOf: this.index.nodeOf,
      edgesAt: this.index.edgesAt,
      blank: this.project === '',
    };
  }

  /**
   * A project that was made just now from a blank map, with no rows yet (^189, ^1263): it is open,
   * and the chunks that were asked for are there at once, empty (there is nothing to read). What is
   * written to it next is patched into them.
   */
  openEmpty(project: string) {
    this.open(project);
    const last = this.last;
    if (!last) return;
    for (const id of idsWhere(last.range, last.near)) {
      const chunk = { id, nodes: [], edges: [], ends: [] };
      this.chunks.set(id, { status: 'ready', chunk });
      this.rows += CHUNK_COST;
    }
  }

  /** The open project is another one (or none, ''): nothing of the earlier one is kept, and its reads are stopped. The project that is open already stays as it is. */
  open(project: string) {
    if (project && project === this.project) return;
    this.generation++;
    this.reading.forEach((r) => r.abort());
    this.reading.clear();
    this.wanted.clear();
    this.queue = [];
    this.project = project;
    this.loader = project ? new ChunkLoader(this.storage, project) : null;
    this.chunks.clear();
    this.progress.clear();
    this.index.clear();
    this.lastWanted.clear();
    this.fresh.clear();
    this.last = null;
    this.pinned.clear();
    this.rows = 0;
    this.tooMuch = false;
  }

  /**
   * Ask for the chunks of a range (those of it whose box `near` says yes to: a turned screen is
   * not all of the box round it, ^1251), and no others: what is not there is read, what is on its
   * way and no longer asked for is stopped.
   */
  show(range: ChunkRange, near?: (box: Box) => boolean) {
    this.last = { range, near };
    // A range that is far too large is not even counted chunk by chunk.
    const ids = countOf(range) > 4 * MAX_CHUNKS ? [] : idsWhere(range, near);
    this.tooMuch = countOf(range) > 4 * MAX_CHUNKS || ids.length > MAX_CHUNKS;
    if (!this.loader || this.tooMuch) return;
    this.wanted.clear();
    // The chunks of what is selected stay asked for, far from the view as they may be (^1257).
    [...ids, ...this.pinned].forEach((id) => this.wanted.add(id));
    for (const [id, state] of this.chunks) {
      if (state.status === 'loading' && !this.wanted.has(id)) this.drop(id);
    }
    this.middle = { x: (range.cx0 + range.cx1) / 2, y: (range.cy0 + range.cy1) / 2 };
    this.requests++;
    this.wanted.forEach((id) => this.lastWanted.set(id, this.requests));
    this.queue = [...this.wanted].filter((id) => !this.chunks.has(id) || this.waiting(id));
    this.queue.sort((a, b) => this.apart(a) - this.apart(b));
    this.queue.forEach(
      (id) =>
        this.chunks.has(id) ||
        (this.chunks.set(id, { status: 'loading' }), this.progress.set(id, 0)),
    );
    this.evict();
    this.pump();
  }

  /**
   * An edit was written (^1260, ^1262): each loaded chunk it touches (`touched`, `'wide'` for a
   * segment that is in all of them) is brought up to date at once from what was written
   * (`patchChunk`), so the next operation and the next frame see it. A chunk that is on its way, one
   * that is being read again, or one that needs a far end the change does not know is read again in
   * place instead: it stays as it is shown until the new one is there.
   */
  edited(patch: ChunkPatch, touched: string[]) {
    for (const id of touched.includes('wide') ? [...this.chunks.keys()] : touched) {
      const state = this.chunks.get(id);
      if (!state) continue;
      const next =
        state.status === 'ready' && !this.fresh.has(id) && patchChunk(state.chunk, patch);
      if (next) this.swap(state.chunk, next);
      else this.reread(id);
    }
    this.evict();
  }

  private swap(old: Chunk, next: Chunk) {
    this.index.remove(old);
    this.rows += this.costOf(next) - this.costOf(old);
    this.index.add(next);
    this.chunks.set(next.id, { status: 'ready', chunk: next });
  }

  private reread(id: string) {
    const state = this.chunks.get(id);
    if (!state || !this.loader) return;
    if (state.status === 'loading') {
      // What is being read may have been read before the edit: start it again.
      this.drop(id);
      if (this.last) this.show(this.last.range, this.last.near);
      return;
    }
    const token = ++this.reads_;
    this.fresh.set(id, token);
    const generation = this.generation;
    this.loader
      .load(id)
      .then((next) => {
        const now = this.chunks.get(id);
        if (
          generation !== this.generation ||
          this.fresh.get(id) !== token ||
          now?.status !== 'ready'
        )
          return;
        this.fresh.delete(id);
        this.swap(now.chunk, next);
        this.evict();
      })
      .catch((e: unknown) => console.error(`[modelcity] chunk ${id} could not be read again`, e));
  }

  /** How far a chunk is from the middle of the view, in chunks. */
  private apart(id: string) {
    const { cx0, cy0 } = rangeOfIds([id]);
    return Math.hypot(cx0 - this.middle.x, cy0 - this.middle.y);
  }

  /** The rows that the loaded chunks hold. */
  get loadedRows() {
    return this.rows;
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
      if (state.status === 'ready') {
        this.rows -= this.costOf(state.chunk);
        this.index.remove(state.chunk);
      }
      this.chunks.delete(id);
      this.fresh.delete(id);
      this.lastWanted.delete(id);
    }
    this.tooMuch = this.rows > this.budgetRows;
    if (this.tooMuch) this.queue = [];
    if (this.tooMuch && this.pinned.size > 0) this.onSqueezed?.();
  }

  private waiting = (id: string) =>
    !this.reading.has(id) && this.chunks.get(id)?.status === 'loading';

  private drop(id: string) {
    this.fresh.delete(id);
    this.reading.get(id)?.abort();
    this.reading.delete(id);
    this.chunks.delete(id);
    this.progress.delete(id);
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
      const began = performance.now();
      const chunk = await loader.load(id, {
        signal: control.signal,
        onProgress: (progress) => generation === this.generation && this.step(id, progress),
      });
      // A read that was stopped (the chunk was dropped, and maybe asked for again) is let go, whatever it found.
      if (generation === this.generation && this.wanted.has(id) && !control.signal.aborted)
        this.arrived(chunk, began);
    } catch (e) {
      if (generation === this.generation && !aborted(e)) {
        console.error(`[modelcity] chunk ${id} could not be read`, e);
        this.chunks.delete(id);
        this.progress.delete(id);
      }
    } finally {
      // Only this read is forgotten: a read of the same chunk that started after it was stopped goes on.
      if (generation === this.generation && this.reading.get(id) === control) {
        this.reading.delete(id);
        this.pump();
      }
    }
  }

  /** A chunk has been read: it is shared, kept, counted against the budget, and the budget is looked at. */
  private arrived(chunk: Chunk, began: number) {
    this.reads.push({
      id: chunk.id,
      ms: performance.now() - began,
      rows: chunk.nodes.length + chunk.edges.length,
    });
    if (this.reads.length > MAX_READS) this.reads.shift();
    this.index.add(chunk);
    this.chunks.set(chunk.id, { status: 'ready', chunk });
    this.progress.delete(chunk.id);
    this.rows += this.costOf(chunk);
    this.evict();
  }

  private step(id: string, progress: number) {
    if (this.chunks.get(id)?.status === 'loading') this.progress.set(id, progress);
  }
}

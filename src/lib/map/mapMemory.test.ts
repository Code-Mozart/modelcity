import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFile } from '../project/file';
import { MemoryStorage, type BoxMm, type ReadOptions } from '../project/storage';
import { file } from '../testing/storageFixtures';
import { MAX_CHUNKS, MapMemory, PARALLEL_READS } from './mapMemory.svelte';
import { chunkOf } from './chunks';

/** Nodes in the chunks (0,0) and (1,0). */
const map = (): ProjectFile => ({
  ...file(),
  nodes: [
    [0, 100_000, 100_000, 0],
    [1, 300_000, 100_000, 0],
  ],
  edges: [[0, 0, 1, null, 1]],
});

/** A storage whose reads of nodes wait until the test lets them go, and that remembers what was asked and stopped. */
class Held extends MemoryStorage {
  started: string[] = [];
  stopped: string[] = [];
  private held = new Map<string, () => void>();

  async nodesIn(id: string, b: BoxMm, read: ReadOptions = {}) {
    const chunk = chunkOf(b.x0 / 1000, b.y0 / 1000).join(',');
    this.started.push(chunk);
    await new Promise<void>((resolve, reject) => {
      this.held.set(chunk, resolve);
      read.signal?.addEventListener(
        'abort',
        () => (this.stopped.push(chunk), reject(read.signal!.reason)),
      );
    });
    return super.nodesIn(id, b, read);
  }

  release = (chunk: string) => this.held.get(chunk)?.();
  releaseAll = () => this.held.forEach((r) => r());
}

async function held() {
  const storage = new Held();
  await storage.put({ id: 'p', file: map() });
  return { storage, memory: new MapMemory(storage) };
}

const row = (cx0: number, cx1: number, cy = 0) => ({ cx0, cx1, cy0: cy, cy1: cy });
const flush = () => vi.advanceTimersByTimeAsync(0);
const states = (m: MapMemory) => [...m.chunks].map(([id, s]) => `${id}:${s.status}`).sort();

describe('the map in memory (^1238, ^1241)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a chunk that is asked for is loading at once, and ready when it is read', async () => {
    const { storage, memory } = await held();
    memory.open('p');
    memory.show(row(0, 1));
    expect(states(memory)).toEqual(['0,0:loading', '1,0:loading']);
    await flush();
    storage.releaseAll();
    await flush();
    expect(states(memory)).toEqual(['0,0:ready', '1,0:ready']);
    const state = memory.chunks.get('0,0');
    expect(state?.status === 'ready' && state.chunk.nodes.map((n) => n[0])).toEqual([0]);
  });

  it('reads a few chunks at the same time, the next one when one is done', async () => {
    const { storage, memory } = await held();
    memory.open('p');
    memory.show(row(0, 9));
    await flush();
    expect(storage.started).toHaveLength(PARALLEL_READS);
    storage.release(storage.started[0]!);
    await flush();
    expect(storage.started).toHaveLength(PARALLEL_READS + 1);
  });

  it('reads the chunk nearest the middle of the view first', async () => {
    const { storage, memory } = await held();
    memory.open('p');
    memory.show(row(0, 8));
    await flush();
    expect(storage.started[0]).toBe('4,0');
    expect(new Set(storage.started)).toEqual(new Set(['4,0', '3,0', '5,0', '2,0']));
  });
});

describe('chunks that are no longer asked for (^1241)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('stops the read of a chunk that left the view, and forgets it', async () => {
    const { storage, memory } = await held();
    memory.open('p');
    memory.show(row(0, 1));
    await flush();
    memory.show(row(1, 2));
    await flush();
    expect(storage.stopped).toEqual(['0,0']);
    expect(states(memory)).toEqual(['1,0:loading', '2,0:loading']);
  });

  it('a chunk that is there stays when it leaves the view (nothing is let go yet)', async () => {
    const { storage, memory } = await held();
    memory.open('p');
    memory.show(row(0, 0));
    await flush();
    storage.releaseAll();
    await flush();
    memory.show(row(5, 5));
    await flush();
    expect(states(memory)).toContain('0,0:ready');
  });

  it('another project forgets the first and stops its reads', async () => {
    const { storage, memory } = await held();
    memory.open('p');
    memory.show(row(0, 1));
    await flush();
    memory.open('q');
    expect(storage.stopped.sort()).toEqual(['0,0', '1,0']);
    expect(memory.chunks.size).toBe(0);
    expect(memory.project).toBe('q');
  });
});

describe('what is asked for twice or too much (^1238)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks the storage once for a chunk that is asked for twice, also while it is on its way', async () => {
    const { storage, memory } = await held();
    memory.open('p');
    memory.show(row(0, 1));
    await flush();
    memory.show(row(0, 1));
    memory.show(row(1, 1));
    await flush();
    expect(storage.started.sort()).toEqual(['0,0', '1,0']);
  });

  it('too many chunks at once load nothing and say so', async () => {
    const { storage, memory } = await held();
    memory.open('p');
    memory.show(row(0, MAX_CHUNKS));
    await flush();
    expect(memory.tooMuch).toBe(true);
    expect(storage.started).toEqual([]);
    memory.show(row(0, 0));
    expect(memory.tooMuch).toBe(false);
  });

  it('with no project nothing is loaded', async () => {
    const { storage, memory } = await held();
    memory.open('');
    memory.show(row(0, 1));
    await flush();
    expect(storage.started).toEqual([]);
    expect(memory.chunks.size).toBe(0);
  });

  it('a slow start leaves the chunk loading', async () => {
    const { memory } = await held();
    memory.latencyMs = 10_000;
    memory.open('p');
    memory.show(row(0, 0));
    await vi.advanceTimersByTimeAsync(9_000);
    expect(states(memory)).toEqual(['0,0:loading']);
  });
});

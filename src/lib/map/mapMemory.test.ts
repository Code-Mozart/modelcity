import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../project/storage';
import { file } from '../testing/storageFixtures';
import type { ProjectFile } from '../project/file';
import { MAX_CHUNKS, MapMemory } from './mapMemory.svelte';

/** Nodes in the chunks (0,0) and (1,0). */
const map = (): ProjectFile => ({
  ...file(),
  nodes: [
    [0, 100_000, 100_000, 0],
    [1, 300_000, 100_000, 0],
  ],
  edges: [[0, 0, 1, null, 1]],
});

async function memory() {
  const storage = new MemoryStorage();
  await storage.put({ id: 'p', file: map() });
  await storage.put({ id: 'q', file: map() });
  return { storage, memory: new MapMemory(storage) };
}

const both = { cx0: 0, cx1: 1, cy0: 0, cy1: 0 };

describe('the map in memory (^1238)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a chunk asked for is loading at once and loaded when it arrives', async () => {
    const { memory: m } = await memory();
    m.open('p');
    const done = m.show(both);
    expect([...m.loading].sort()).toEqual(['0,0', '1,0']);
    await done;
    expect(m.loading.size).toBe(0);
    expect([...m.ready.keys()].sort()).toEqual(['0,0', '1,0']);
    expect(m.ready.get('0,0')!.nodes.map((n) => n[0])).toEqual([0]);
  });

  it('a slow read leaves the chunks loading, and the camera has nothing to wait for', async () => {
    const { memory: m } = await memory();
    m.latencyMs = 10_000;
    m.open('p');
    const done = m.show(both);
    await vi.advanceTimersByTimeAsync(9_000);
    expect(m.loading.size).toBe(2);
    expect(m.ready.size).toBe(0);
    await vi.advanceTimersByTimeAsync(2_000);
    await done;
    expect(m.ready.size).toBe(2);
  });
});

describe('asking for chunks again (^1238)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks the storage once for chunks that are asked for twice, also while they are on their way', async () => {
    const { storage, memory: m } = await memory();
    const read = vi.spyOn(storage, 'nodesIn');
    m.open('p');
    await Promise.all([m.show(both), m.show(both), m.show({ ...both, cx0: 1 })]);
    await m.show(both);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('another project forgets the first, also what is still on its way', async () => {
    const { memory: m } = await memory();
    m.latencyMs = 1000;
    m.open('p');
    const stale = m.show(both);
    m.open('q');
    expect(m.loading.size + m.ready.size).toBe(0);
    await vi.advanceTimersByTimeAsync(1500);
    await stale;
    expect(m.ready.size).toBe(0);
    expect(m.project).toBe('q');
  });
});

describe('what is not asked for (^1238)', () => {
  it('too many chunks at once load nothing and say so', async () => {
    const { storage, memory: m } = await memory();
    const read = vi.spyOn(storage, 'nodesIn');
    m.open('p');
    await m.show({ cx0: 0, cx1: MAX_CHUNKS, cy0: 0, cy1: 1 });
    expect(m.tooMuch).toBe(true);
    expect(read).not.toHaveBeenCalled();
    await m.show(both);
    expect(m.tooMuch).toBe(false);
  });

  it('with no project nothing is loaded', async () => {
    const { storage, memory: m } = await memory();
    const read = vi.spyOn(storage, 'nodesIn');
    m.open('');
    await m.show(both);
    expect(read).not.toHaveBeenCalled();
    expect(m.loading.size).toBe(0);
  });
});

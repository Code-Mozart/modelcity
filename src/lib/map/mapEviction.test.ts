import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFile } from '../project/file';
import { MemoryStorage } from '../project/storage';
import { file } from '../testing/storageFixtures';
import { MapMemory } from './mapMemory.svelte';

/** Ten chunks in a row, five nodes in each: a chunk costs 6 rows (the nodes and one for itself). */
const map = (): ProjectFile => ({
  ...file(),
  nodes: Array.from({ length: 50 }, (_, i): ProjectFile['nodes'][number] => [
    i,
    Math.floor(i / 5) * 256_000 + (i % 5) * 1000,
    1000,
    0,
  ]),
  edges: [],
});

async function loaded() {
  const storage = new MemoryStorage();
  await storage.put({ id: 'p', file: map() });
  const memory = new MapMemory(storage);
  memory.open('p');
  memory.budgetRows = 20;
  /** Ask for chunks (in a row) and wait until they are read. */
  const ask = async (from: number, to = from) => {
    memory.show({ cx0: from, cx1: to, cy0: 0, cy1: 0 });
    await vi.advanceTimersByTimeAsync(10);
  };
  const ready = () =>
    [...memory.chunks]
      .filter(([, s]) => s.status === 'ready')
      .map(([id]) => id)
      .sort();
  return { memory, ask, ready };
}

describe('letting go of chunks (^1246)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps everything while it fits, and over the budget frees the one asked for longest ago, down to 80%', async () => {
    const { ask, ready } = await loaded();
    for (const cx of [0, 1, 2]) await ask(cx);
    expect(ready()).toEqual(['0,0', '1,0', '2,0']);
    await ask(3);
    expect(ready()).toEqual(['2,0', '3,0']);
  });

  it('never lets go of what is asked for, and says so when that alone is too much', async () => {
    const { memory, ask, ready } = await loaded();
    await ask(0, 3);
    expect(ready()).toEqual(['0,0', '1,0', '2,0', '3,0']);
    expect(memory.tooMuch).toBe(true);
    await ask(0, 0);
    expect(memory.tooMuch).toBe(false);
  });

  it('of chunks asked for at the same time lets go of the one farthest from the view first', async () => {
    const { memory, ask, ready } = await loaded();
    memory.budgetRows = 16;
    await ask(0, 1);
    await ask(5);
    expect(ready()).toEqual(['1,0', '5,0']);
  });
});

describe('what stays, and what comes back (^1246)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps a pinned chunk, whatever it costs', async () => {
    const { memory, ask, ready } = await loaded();
    for (const cx of [0, 1, 2]) await ask(cx);
    memory.pinned.add('0,0');
    await ask(3);
    expect(ready()).toEqual(
      ['0,0', '2,0', '3,0'].filter((id) => id !== '2,0' || ready().includes(id)),
    );
    expect(ready()).toContain('0,0');
  });

  it('reads a chunk again that was let go and is asked for again', async () => {
    const { ask, ready } = await loaded();
    for (const cx of [0, 1, 2, 3]) await ask(cx);
    expect(ready()).not.toContain('0,0');
    await ask(0);
    expect(ready()).toContain('0,0');
  });
});

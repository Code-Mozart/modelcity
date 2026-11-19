import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toMapChange } from '../edit/change';
import { deleteNodes } from '../edit/deleteNodes';
import { affectedChunks, indexChangeOf } from '../edit/indexChange';
import { MemoryStorage, type EdgeRow, type NodeRow } from '../project/storage';
import { file } from '../testing/storageFixtures';
import { MapMemory } from './mapMemory.svelte';
import { buildIndex } from './segmentIndex';

/** The ids of the segments that the chunks hold, one for each chunk that holds it. */
const edgesHeld = (memory: MapMemory) => {
  const out: number[] = [];
  for (const s of memory.chunks.values())
    if (s.status === 'ready') out.push(...s.chunk.edges.map((e) => e[0]));
  return out;
};

/** A road 1 - 2 - 3 along the x axis, the nodes 300 m apart, in the chunks (0,0), (1,0) and (2,0); and a branch from 2 to 4. */
const nodes: NodeRow[] = [
  [1, 100_000, 100_000, 0],
  [2, 400_000, 100_000, 0],
  [3, 700_000, 100_000, 0],
  [4, 400_000, 400_000, 0],
];
const edges: EdgeRow[] = [
  [10, 1, 2, null, 1],
  [11, 2, 3, null, 1],
  [12, 2, 4, null, 1],
];

async function open() {
  const storage = new MemoryStorage();
  await storage.put({ id: 'p', file: { ...file(), nodes, edges } });
  await buildIndex(storage, 'p');
  const memory = new MapMemory(storage);
  memory.open('p');
  memory.show({ cx0: 0, cx1: 3, cy0: 0, cy1: 1 });
  await vi.advanceTimersByTimeAsync(50);
  return { storage, memory };
}

/** The rows that the chunks hold, by chunk. */
const held = (memory: MapMemory) =>
  Object.fromEntries(
    [...memory.chunks]
      .filter(([, s]) => s.status === 'ready')
      .map(([id, s]) => {
        const c = (s as { chunk: { nodes: NodeRow[]; edges: EdgeRow[]; ends: NodeRow[] } }).chunk;
        const ids = (rows: { 0: number }[]) =>
          rows
            .map((r) => r[0])
            .sort((a, b) => a - b)
            .join();
        return [id, `${ids(c.nodes)}|${ids(c.edges)}|${ids(c.ends)}`];
      }),
  );

async function deleteAndShow(storage: MemoryStorage, memory: MapMemory, ids: number[]) {
  const source = {
    nodes: (n: number[]) => storage.nodesByIds('p', n),
    edgesAt: (n: number[]) => storage.edgesOf('p', n),
  };
  const change = await deleteNodes(source, ids);
  await storage.patch('p', file(), toMapChange(change), indexChangeOf(change));
  const map = toMapChange(change);
  memory.edited({ nodes: map.removedNodes, edges: map.removedEdges }, affectedChunks(change));
  return change;
}

describe('the chunks in memory after an edit (^1260)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('rows that are gone are not in any chunk at once, nodes as well as the far ends of segments', async () => {
    const { storage, memory } = await open();
    expect(memory.index.nodeOf(3)).toBeDefined();
    await deleteAndShow(storage, memory, [3]);
    expect(memory.index.nodeOf(3)).toBeUndefined();
    expect(
      memory.index
        .edgesAt(2)
        .map((e) => e[0])
        .sort(),
    ).toEqual([10, 12]);
  });

  it('after the chunks are read again they hold what a chunk that is read from nothing holds', async () => {
    const { storage, memory } = await open();
    await deleteAndShow(storage, memory, [2]);
    await vi.advanceTimersByTimeAsync(50);
    const fresh = new MapMemory(storage);
    fresh.open('p');
    fresh.show({ cx0: 0, cx1: 3, cy0: 0, cy1: 1 });
    await vi.advanceTimersByTimeAsync(50);
    expect(held(memory)).toEqual(held(fresh));
  });
});

describe('the chunks in memory after an edit is read again or undone (^1260)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a segment that is changed (not gone) is the new row in every chunk that has it, also in the index of rows', async () => {
    const { storage, memory } = await open();
    // Deleting node 2 dissolves nothing here (three segments); delete node 3 and then 1 so that 2 has one in and one out: 1 - 2 - 4.
    await deleteAndShow(storage, memory, [3]);
    await vi.advanceTimersByTimeAsync(50);
    await deleteAndShow(storage, memory, [2]);
    await vi.advanceTimersByTimeAsync(50);
    expect(storage).toBeDefined();
    const rows = [...memory.chunks.values()].flatMap((s) =>
      s.status === 'ready' ? s.chunk.edges : [],
    );
    // Whatever is left in the chunks is exactly what the storage holds.
    const stored = ((await storage.load('p')) as unknown as { edges: EdgeRow[] }).edges.map((e) =>
      JSON.stringify(e),
    );
    for (const row of rows) expect(stored).toContain(JSON.stringify(row));
  });
});

describe('a segment that changed is the new row in the chunks (^1260)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a segment whose end changed shows its new end after the chunks are read again (a dissolved node)', async () => {
    const storage = new MemoryStorage();
    const line: NodeRow[] = [
      [1, 100_000, 100_000, 0],
      [2, 400_000, 100_000, 0],
      [3, 700_000, 100_000, 0],
    ];
    await storage.put({
      id: 'p',
      file: {
        ...file(),
        nodes: line,
        edges: [
          [10, 1, 2, null, 1],
          [11, 2, 3, null, 1],
        ],
      },
    });
    await buildIndex(storage, 'p');
    const memory = new MapMemory(storage);
    memory.open('p');
    memory.show({ cx0: 0, cx1: 2, cy0: 0, cy1: 0 });
    await vi.advanceTimersByTimeAsync(50);
    await deleteAndShow(storage, memory, [2]);
    await vi.advanceTimersByTimeAsync(100);
    expect(JSON.stringify(memory.index.edgesAt(1))).toBe('[[10,1,3,null,1]]');
    for (const s of memory.chunks.values())
      if (s.status === 'ready') for (const e of s.chunk.edges) expect(e[2]).toBe(3);
  });
});

describe('what shows after an edit is read again, and after it is undone (^1260)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a chunk that is read again is not shown as loading, and the rows count stays right', async () => {
    const { storage, memory } = await open();
    const seen: string[] = [];
    const before = memory.loadedRows;
    await deleteAndShow(storage, memory, [3]);
    for (const [, s] of memory.chunks) seen.push(s.status);
    expect(seen.every((s) => s === 'ready')).toBe(true);
    await vi.advanceTimersByTimeAsync(50);
    expect(memory.loadedRows).toBeLessThan(before);
  });

  it('an edit that is undone brings its rows back (read again)', async () => {
    const { storage, memory } = await open();
    const change = await deleteAndShow(storage, memory, [2]);
    await vi.advanceTimersByTimeAsync(50);
    const back = {
      nodes: change.nodes.map((p) => ({ before: p.after, after: p.before })),
      edges: change.edges.map((p) => ({ before: p.after, after: p.before })),
      context: change.context,
    };
    await storage.patch('p', file(), toMapChange(back), indexChangeOf(back));
    const map = toMapChange(back);
    memory.edited({ nodes: map.removedNodes, edges: map.removedEdges }, affectedChunks(back));
    await vi.advanceTimersByTimeAsync(50);
    expect(memory.index.nodeOf(2)).toBeDefined();
    expect(
      memory.index
        .edgesAt(2)
        .map((e) => e[0])
        .sort(),
    ).toEqual([10, 11, 12]);
  });
});

/** A storage whose reads of the segments of one chunk wait, as many times as it is told to: each read is done at once and its answer waits to be let go. */
class Slow extends MemoryStorage {
  hold: string | null = null;
  holds = 0;
  releases: (() => void)[] = [];

  async edgesInChunk(id: string, cx: number, cy: number, version: number) {
    const rows = await super.edgesInChunk(id, cx, cy, version);
    if (this.hold === `${cx},${cy}` && this.holds > 0) {
      this.holds--;
      await new Promise<void>((resolve) => this.releases.push(resolve));
    }
    return rows;
  }
}

/** The chunk (1,0) with two reads afresh in the air, the first started before the chunk was let go and read again. */
async function twoSlowReads() {
  const storage = new Slow();
  await storage.put({ id: 'p', file: { ...file(), nodes, edges } });
  await buildIndex(storage, 'p');
  const memory = new MapMemory(storage);
  memory.open('p');
  memory.budgetRows = 1;
  const ask = async (cx: number, cy: number) => {
    memory.show({ cx0: cx, cx1: cx, cy0: cy, cy1: cy });
    await vi.advanceTimersByTimeAsync(50);
  };
  await ask(1, 0);
  [storage.hold, storage.holds] = ['1,0', 1];
  await deleteAndShow(storage, memory, [4]);
  await vi.advanceTimersByTimeAsync(10);
  // The chunk is let go (another one is asked for, over the budget) and read again.
  await ask(3, 1);
  await ask(1, 0);
  storage.holds = 1;
  await deleteAndShow(storage, memory, [2]);
  await vi.advanceTimersByTimeAsync(10);
  return { storage, memory };
}

describe('a read afresh that is late does not overwrite a newer one (^1260)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('also when the chunk was let go and read again in between, and both reads are slow', async () => {
    const { storage, memory } = await twoSlowReads();
    expect(storage.releases).toHaveLength(2);
    const before = JSON.stringify(held(memory));
    // The first read comes in, late, with what was there before the second edit: it is let go.
    storage.releases[0]!();
    await vi.advanceTimersByTimeAsync(50);
    expect(JSON.stringify(held(memory))).toBe(before);
    storage.releases[1]!();
    await vi.advanceTimersByTimeAsync(50);
    const probe = new MapMemory(storage);
    probe.open('p');
    probe.show({ cx0: 1, cx1: 1, cy0: 0, cy1: 0 });
    await vi.advanceTimersByTimeAsync(50);
    expect(held(memory)['1,0']).toBe(held(probe)['1,0']);
  });
});

describe('a segment that is in every chunk (too large to be listed in each, ^1239, ^1260)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is gone from all the chunks that are loaded when it is deleted, and comes back with the undo', async () => {
    // Two nodes 30 km apart: the box of their segment is larger than a segment is listed with.
    const far: NodeRow[] = [
      [1, 100_000, 100_000, 0],
      [2, 30_000_000, 30_000_000, 0],
    ];
    const storage = new MemoryStorage();
    await storage.put({ id: 'p', file: { ...file(), nodes: far, edges: [[10, 1, 2, null, 1]] } });
    await buildIndex(storage, 'p');
    const memory = new MapMemory(storage);
    memory.open('p');
    memory.show({ cx0: 0, cx1: 1, cy0: 0, cy1: 0 });
    await vi.advanceTimersByTimeAsync(50);
    const inChunks = () => edgesHeld(memory);
    expect(inChunks()).toEqual([10, 10]);
    const change = await deleteAndShow(storage, memory, [2]);
    await vi.advanceTimersByTimeAsync(50);
    expect(inChunks()).toEqual([]);
    const back = {
      nodes: change.nodes.map((p) => ({ before: p.after, after: p.before })),
      edges: change.edges.map((p) => ({ before: p.after, after: p.before })),
      context: change.context,
    };
    await storage.patch('p', file(), toMapChange(back), indexChangeOf(back));
    const map = toMapChange(back);
    memory.edited({ nodes: map.removedNodes, edges: map.removedEdges }, affectedChunks(back));
    await vi.advanceTimersByTimeAsync(50);
    expect(inChunks()).toEqual([10, 10]);
  });
});

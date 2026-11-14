import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProjectFile } from '../project/file';
import { IndexedDbStorage } from '../project/indexedDb';
import { file } from '../testing/storageFixtures';
import { ChunkLoader } from './chunkLoader';

globalThis.IDBKeyRange = IDBKeyRange;

/** 1300 nodes in the chunk (0,0), 20 in (1,0): the rows are counted while they are read (^1241). */
const crowded = (): ProjectFile => ({
  ...file(),
  nodes: [
    ...Array.from({ length: 1300 }, (_, i): ProjectFile['nodes'][number] => [
      i,
      (i % 250) * 1000,
      Math.floor(i / 250) * 1000,
      0,
    ]),
    ...Array.from({ length: 20 }, (_, i): ProjectFile['nodes'][number] => [
      2000 + i,
      300_000 + i,
      10_000,
      0,
    ]),
  ],
  edges: [],
});

describe('the progress of reading a chunk is real (^1241)', () => {
  let loader: ChunkLoader;
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    const storage = new IndexedDbStorage();
    await storage.put({ id: 'p', file: crowded() });
    loader = new ChunkLoader(storage, 'p');
  });

  it('counts rows read of rows there are: it rises in steps and ends at 1', async () => {
    const seen: number[] = [];
    const chunk = await loader.load('0,0', { onProgress: (p) => seen.push(p) });
    expect(chunk.nodes).toHaveLength(1300);
    expect(seen.length).toBeGreaterThan(3);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(seen.filter((p) => p > 0 && p < 0.9).length).toBeGreaterThanOrEqual(2);
    expect(seen.at(-1)).toBe(1);
  });

  it('stops when told to, also in the middle of the rows', async () => {
    const control = new AbortController();
    const read = loader.load('0,0', { signal: control.signal, onProgress: () => control.abort() });
    await expect(read).rejects.toMatchObject({ name: 'AbortError' });
    expect(control.signal.aborted).toBe(true);
    await expect(loader.load('1,0', { signal: control.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

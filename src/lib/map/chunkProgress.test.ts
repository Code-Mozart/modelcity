import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProjectFile } from '../project/file';
import { IndexedDbStorage } from '../project/indexedDb';
import { file } from '../testing/storageFixtures';
import { ChunkLoader } from './chunkLoader';
import { buildIndex } from './segmentIndex';

globalThis.IDBKeyRange = IDBKeyRange;

/** 1300 nodes in the chunk (0,0), 20 in (1,0), and a segment between two of them. */
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
  edges: [[0, 0, 2000, null, 1]],
});

describe('how far the read of a chunk is (^1241)', () => {
  let loader: ChunkLoader;
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    const storage = new IndexedDbStorage();
    await storage.put({ id: 'p', file: crowded() });
    await buildIndex(storage, 'p');
    loader = new ChunkLoader(storage, 'p');
  });

  it('says which part is done: the nodes and segments, then the nodes at the far ends; it rises and ends at 1', async () => {
    const seen: number[] = [];
    const chunk = await loader.load('0,0', { onProgress: (p) => seen.push(p) });
    expect(chunk.nodes).toHaveLength(1300);
    expect(chunk.ends.map((n) => n[0])).toEqual([2000]);
    expect(seen).toEqual([0.7, 1]);
  });

  it('stops when told to, between the parts', async () => {
    const control = new AbortController();
    const read = loader.load('0,0', { signal: control.signal, onProgress: () => control.abort() });
    await expect(read).rejects.toMatchObject({ name: 'AbortError' });
    await expect(loader.load('1,0', { signal: control.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

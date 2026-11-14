import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProjectFile } from '../project/file';
import { IndexedDbStorage } from '../project/indexedDb';
import { MemoryStorage, type ProjectStorage } from '../project/storage';
import { file } from '../testing/storageFixtures';
import { ChunkLoader } from './chunkLoader';

globalThis.IDBKeyRange = IDBKeyRange;

const row = (id: number, x: number, y: number): ProjectFile['nodes'][number] => [
  id,
  x * 1000,
  y * 1000,
  0,
];

/** Nodes in the chunks (0,0), (1,0), (2,0) and (0,1); a segment from the first to the third crosses the second. */
const map = (): ProjectFile => ({
  ...file(),
  nodes: [row(0, 100, 100), row(1, 300, 100), row(2, 600, 100), row(3, 100, 300), row(4, 120, 110)],
  edges: [
    [0, 0, 1, null, 1],
    [1, 1, 2, null, 1],
    [2, 0, 3, null, 1],
    [3, 0, 4, null, 1],
  ],
});

const storages: [string, () => ProjectStorage][] = [
  ['memory', () => new MemoryStorage()],
  [
    'IndexedDB',
    () => {
      globalThis.indexedDB = new IDBFactory();
      return new IndexedDbStorage();
    },
  ],
];

describe.each(storages)('reading one chunk: %s', (_name, make) => {
  let loader: ChunkLoader;
  beforeEach(async () => {
    const s = make();
    await s.put({ id: 'p', file: map() });
    loader = new ChunkLoader(s, 'p');
  });

  it('has its nodes, the segments of those, and the nodes at their far ends known', async () => {
    const chunk = await loader.load('0,0');
    expect(chunk.nodes.map((n) => n[0]).sort()).toEqual([0, 4]);
    expect(chunk.edges.map((e) => e[0]).sort()).toEqual([0, 2, 3]);
    expect([1, 3].map((id) => loader.nodeOf(id)?.[0])).toEqual([1, 3]);
  });

  it('a segment between two chunks is in both, a node is in the one whose cell holds it', async () => {
    const [a, b] = [await loader.load('0,0'), await loader.load('1,0')];
    expect(a.edges.map((e) => e[0])).toContain(0);
    expect(b.edges.map((e) => e[0]).sort()).toEqual([0, 1]);
    expect(b.nodes.map((n) => n[0])).toEqual([1]);
  });

  it('the right and bottom edge of a chunk belong to the next one', async () => {
    const s = make();
    await s.put({
      id: 'e',
      file: { ...file(), nodes: [row(0, 256, 10), row(1, 10, 256)], edges: [] },
    });
    const edge = new ChunkLoader(s, 'e');
    expect((await edge.load('0,0')).nodes).toEqual([]);
    expect((await edge.load('1,0')).nodes.map((n) => n[0])).toEqual([0]);
    expect((await edge.load('0,1')).nodes.map((n) => n[0])).toEqual([1]);
  });

  it('an empty chunk is a chunk with nothing in it', async () => {
    expect(await loader.load('5,5')).toEqual({ id: '5,5', nodes: [], edges: [] });
  });

  it('the segment that only crosses a chunk is not found there yet (^1239)', async () => {
    const chunk = await loader.load('1,1');
    expect(chunk.edges).toEqual([]);
    expect((await loader.load('1,0')).edges.map((e) => e[0])).toContain(1);
  });
});

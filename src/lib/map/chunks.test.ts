import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { IndexedDbStorage } from '../project/indexedDb';
import type { ProjectFile } from '../project/file';
import { MemoryStorage, type ProjectStorage } from '../project/storage';
import { file } from '../testing/storageFixtures';
import { ChunkLoader } from './chunkLoader';
import { CHUNK_M, chunkOf, chunksOf, countOf, idsOf } from './chunks';
import { chunksInView } from './inView';

globalThis.IDBKeyRange = IDBKeyRange;

describe('the chunks of a box (^1231)', () => {
  it('a chunk holds its left and top edge, not its right and bottom one', () => {
    expect(chunkOf(0, 0)).toEqual([0, 0]);
    expect(chunkOf(CHUNK_M - 0.001, CHUNK_M)).toEqual([0, 1]);
    expect(chunkOf(-0.001, -CHUNK_M)).toEqual([-1, -1]);
  });

  it('a box touches the chunks it overlaps, also with negative coordinates', () => {
    const r = chunksOf({ x0: -10, x1: 300, y0: 5, y1: 20 });
    expect(r).toEqual({ cx0: -1, cx1: 1, cy0: 0, cy1: 0 });
    expect([...idsOf(r)]).toEqual(['-1,0', '0,0', '1,0']);
  });
});

/** Nodes in chunks (0,0), (1,0), (2,0) and (0,1); a segment from the first to the third crosses the second. */
const row = (id: number, x: number, y: number): ProjectFile['nodes'][number] => [
  id,
  x * 1000,
  y * 1000,
  0,
];
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

describe.each(storages)('loading chunks (dry): %s', (_name, make) => {
  let loader: ChunkLoader;
  beforeEach(async () => {
    const s = make();
    await s.put({ id: 'p', file: map() });
    loader = new ChunkLoader(s, 'p');
  });

  it('reads the chunks that are asked for: their nodes, the segments of those, the far ends', async () => {
    const found = await loader.load({ cx0: 0, cx1: 0, cy0: 0, cy1: 0 });
    expect(found).toEqual({ chunks: 1, nodes: 2, edges: 3, ends: 2 });
    const chunk = loader.chunks.get('0,0')!;
    expect(chunk.nodes.map((n) => n[0]).sort()).toEqual([0, 4]);
    expect(chunk.edges.map((e) => e[0]).sort()).toEqual([0, 2, 3]);
  });

  it('a segment between two chunks is in both once they are loaded, and in one only once', async () => {
    await loader.load({ cx0: 0, cx1: 1, cy0: 0, cy1: 0 });
    expect(
      loader.chunks
        .get('0,0')!
        .edges.map((e) => e[0])
        .sort(),
    ).toEqual([0, 2, 3]);
    expect(
      loader.chunks
        .get('1,0')!
        .edges.map((e) => e[0])
        .sort(),
    ).toEqual([0, 1]);
    expect(loader.chunks.get('1,0')!.nodes.map((n) => n[0])).toEqual([1]);
  });
});

describe.each(storages)('loading more chunks (dry): %s', (_name, make) => {
  let loader: ChunkLoader;
  beforeEach(async () => {
    const s = make();
    await s.put({ id: 'p', file: map() });
    loader = new ChunkLoader(s, 'p');
  });

  it('asks the storage only for chunks that are not there yet', async () => {
    await loader.load({ cx0: 0, cx1: 1, cy0: 0, cy1: 0 });
    const again = await loader.load({ cx0: 0, cx1: 2, cy0: 0, cy1: 0 });
    expect(again.chunks).toBe(1);
    expect(again.nodes).toBe(1);
    expect(await loader.load({ cx0: 0, cx1: 2, cy0: 0, cy1: 0 })).toMatchObject({
      chunks: 0,
      nodes: 0,
    });
  });

  it('an empty chunk is loaded too (and not asked about again)', async () => {
    expect(await loader.load({ cx0: 5, cx1: 6, cy0: 5, cy1: 5 })).toMatchObject({
      chunks: 2,
      nodes: 0,
    });
    expect(loader.chunks.get('5,5')).toEqual({ id: '5,5', nodes: [], edges: [] });
  });

  it('the segment that only crosses a chunk is not found there yet (^1229)', async () => {
    await loader.load({ cx0: 1, cx1: 1, cy0: 0, cy1: 0 });
    const ids = loader.chunks.get('1,0')!.edges.map((e) => e[0]);
    expect(ids).toEqual(expect.arrayContaining([0, 1]));
    await loader.load({ cx0: 2, cx1: 2, cy0: 1, cy1: 1 });
    expect(loader.chunks.get('2,1')!.edges).toEqual([]);
  });
});

describe('the chunks in view (^1231)', () => {
  const size = { width: 1000, height: 600 };
  const at = (cx: number, cy: number, scale: number, rot = 0) => ({
    cx,
    cy,
    scale,
    rot,
    gx: 0,
    gy: 0,
  });

  it('a screen at 2 pixels a meter shows 500 by 300 meters round its center', () => {
    expect(chunksInView(at(0, 0, 2), size)).toEqual({ cx0: -1, cx1: 0, cy0: -1, cy1: 0 });
  });

  it('room round the screen asks for more chunks, zooming out for many more', () => {
    expect(chunksInView(at(0, 0, 2), size, 300)).toEqual({ cx0: -3, cx1: 2, cy0: -2, cy1: 1 });
    expect(countOf(chunksInView(at(0, 0, 0.1), size))).toBeGreaterThan(300);
  });

  it('a rotated screen touches the chunks of its bounding box', () => {
    const turned = chunksInView(at(0, 0, 2, Math.PI / 4), size);
    expect(countOf(turned)).toBeGreaterThan(countOf(chunksInView(at(0, 0, 2), size)));
  });
});

import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { file, none } from '../testing/storageFixtures';
import { IndexedDbStorage } from './indexedDb';
import {
  headerOf,
  MemoryStorage,
  type IndexRecord,
  type NodeRow,
  type ProjectStorage,
} from './storage';

globalThis.IDBKeyRange = IDBKeyRange;

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

/** The two segments of the fixture (ids 0 and 3): the first in chunk (0,0), the second in (0,0) and (1,0). */
const records: IndexRecord[] = [
  { id: 0, box: [0, 0, 1000, 1000], cells: [[0, 0]] },
  {
    id: 3,
    box: [0, 0, 300_000, 1000],
    cells: [
      [0, 0],
      [1, 0],
    ],
  },
];

describe.each(storages)('the segment index in the storage (^1239): %s', (_name, make) => {
  let s: ProjectStorage;
  beforeEach(async () => {
    s = make();
    await s.put({ id: 'a', file: file() });
  });

  it('counts the segments and the records of a version', async () => {
    expect(await s.indexStatus('a', 1)).toMatchObject({ segments: 2, indexed: 0 });
    await s.putIndex('a', 1, records);
    expect(await s.indexStatus('a', 1)).toMatchObject({ segments: 2, indexed: 2 });
    expect(await s.indexStatus('a', 2)).toMatchObject({ segments: 2, indexed: 0 });
  });

  it('pages through the segments in the order of their ids', async () => {
    expect((await s.edgesAfter('a', -1, 1)).map((e) => e[0])).toEqual([0]);
    expect((await s.edgesAfter('a', 0, 5)).map((e) => e[0])).toEqual([3]);
    expect(await s.edgesAfter('a', 3, 5)).toEqual([]);
  });

  it('says which segments have a record of the version', async () => {
    await s.putIndex('a', 1, [records[0]!]);
    expect([...(await s.indexedIds('a', [0, 3], 1))]).toEqual([0]);
    expect([...(await s.indexedIds('a', [0, 3], 2))]).toEqual([]);
  });

  it('gives the segments of a chunk by the chunks their boxes cover, and the wide ones for every chunk', async () => {
    await s.putIndex('a', 1, records);
    expect((await s.edgesInChunk('a', 0, 0, 1)).map((e) => e[0]).sort()).toEqual([0, 3]);
    expect((await s.edgesInChunk('a', 1, 0, 1)).map((e) => e[0])).toEqual([3]);
    expect(await s.edgesInChunk('a', 5, 5, 1)).toEqual([]);
    await s.putIndex('a', 1, [{ id: 0, box: [0, 0, 9, 9], cells: 'wide' }]);
    expect((await s.edgesInChunk('a', 5, 5, 1)).map((e) => e[0])).toEqual([0]);
    expect(await s.edgesInChunk('a', 0, 0, 2)).toEqual([]);
  });
});

describe.each(storages)('the segment index goes with the map (^1239, ^1243): %s', (_name, make) => {
  let s: ProjectStorage;
  beforeEach(async () => {
    s = make();
    await s.put({ id: 'a', file: file() });
  });

  it('is thrown away when the map of the project is written or changed, not when only the header is', async () => {
    await s.putIndex('a', 1, records);
    await s.patch('a', headerOf(file('Renamed')));
    expect((await s.indexStatus('a', 1)).indexed).toBe(2);
    await s.patch('a', headerOf(file()), { ...none, nodes: [[9, 0, 0, 0]] });
    expect((await s.indexStatus('a', 1)).indexed).toBe(0);
    await s.putIndex('a', 1, records);
    await s.put({ id: 'a', file: file() });
    expect((await s.indexStatus('a', 1)).indexed).toBe(0);
  });

  it('can be cleared, and goes with the project', async () => {
    await s.putIndex('a', 1, records);
    await s.clearIndex('a');
    expect((await s.indexStatus('a', 1)).indexed).toBe(0);
    await s.putIndex('a', 1, records);
    await s.remove('a');
    expect((await s.indexStatus('a', 1)).indexed).toBe(0);
  });
});

describe.each(storages)('the cells of the nodes in the storage (^1250): %s', (_name, make) => {
  let s: ProjectStorage;
  beforeEach(async () => {
    s = make();
    await s.put({ id: 'a', file: file() });
  });

  it('counts the nodes and the cells of a version, pages through the nodes, and finds the nodes of a chunk (^1250)', async () => {
    expect(await s.indexStatus('a', 1)).toMatchObject({ nodes: 3, nodesIndexed: 0 });
    expect((await s.nodesAfter('a', -1, 2)).map((n) => n[0])).toEqual([0, 1]);
    expect((await s.nodesAfter('a', 1, 5)).map((n) => n[0])).toEqual([5]);
    const [first, second] = (await s.nodesAfter('a', -1, 2)) as [NodeRow, NodeRow];
    await s.putNodeCells('a', 1, [
      { node: first, cell: [0, 0] },
      { node: second, cell: [0, -1] },
    ]);
    expect(await s.indexStatus('a', 1)).toMatchObject({ nodesIndexed: 2 });
    expect(await s.indexStatus('a', 2)).toMatchObject({ nodesIndexed: 0 });
    expect([...(await s.indexedNodeIds('a', [0, 1, 5], 1))].sort()).toEqual([0, 1]);
    expect(await s.nodesInChunk('a', 0, -1, 1)).toEqual([second]);
    expect(await s.nodesInChunk('a', 0, 0, 2)).toEqual([]);
  });
});

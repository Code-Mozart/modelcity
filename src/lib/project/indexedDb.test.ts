import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { file, none } from '../testing/storageFixtures';
import type { ProjectFile } from './file';
import { IndexedDbStorage } from './indexedDb';
import { headerOf } from './storage';
import { buildIndex, INDEX_VERSION } from '../map/segmentIndex';

globalThis.IDBKeyRange = IDBKeyRange;

const raw = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open('modelcity', 5);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
const all = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve) => {
    r.onsuccess = () => resolve(r.result);
  });

describe('the rows in IndexedDB', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('keeps the rows in blocks of ids, and finds the segments by their nodes (^1254)', async () => {
    const s = new IndexedDbStorage();
    await s.put({ id: 'a', file: file() });
    await s.put({ id: 'b', file: file() });
    const db = await raw();
    const nodes = await all(db.transaction('nodeblocks').objectStore('nodeblocks').getAll());
    // The fixture has three nodes with small ids: one block for each project, not a record for each row.
    expect(nodes.map((b) => [b.p, b.id, b.rows.length])).toEqual([
      ['a', 0, 3],
      ['b', 0, 3],
    ]);
    expect(JSON.stringify(nodes)).not.toMatch(/chunk|cell/);
    expect((await s.edgesOf('a', [1])).map((e) => e[0]).sort()).toEqual([0, 3]);
    expect(await s.edgesOf('a', [99])).toEqual([]);
  });
});

describe('the blocks of rows in IndexedDB (^1254)', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('reads and changes rows far apart and gives a row twice only once', async () => {
    const s = new IndexedDbStorage();
    await s.put({ id: 'a', file: file() });
    const far = 1000 * 128 + 5;
    await s.patch('a', headerOf(file()), {
      ...none,
      nodes: [
        [far, 1, 2, 3],
        [1, 9, 9, 9],
      ],
    });
    expect(await s.nodesByIds('a', [far, 1, 4])).toEqual([
      [1, 9, 9, 9],
      [far, 1, 2, 3],
    ]);
    expect((await s.nodesAfter('a', 5, 10)).map((n) => n[0])).toEqual([far]);
    await s.patch('a', headerOf(file()), { ...none, removedNodes: [far] });
    expect(await s.nodesAfter('a', 5, 10)).toEqual([]);
  });
});

describe('the refusals of rows in IndexedDB (^1254)', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('refuses rows whose id is there already, and writes nothing of that call', async () => {
    const s = new IndexedDbStorage();
    await s.append('a', { nodes: [[0, 0, 0, 0]], edges: [] });
    const clash = await s
      .append('a', {
        nodes: [
          [7, 0, 0, 0],
          [0, 1, 1, 1],
        ],
        edges: [],
      })
      .catch((e: Error) => e);
    expect((clash as Error).name).toBe('ConstraintError');
    expect(await s.nodesAfter('a', -1, 10)).toEqual([[0, 0, 0, 0]]);
    const twice = await s
      .append('b', {
        nodes: [
          [3, 0, 0, 0],
          [3, 1, 1, 1],
        ],
        edges: [],
      })
      .catch((e: Error) => e);
    expect((twice as Error).name).toBe('ConstraintError');
  });
});

describe('the layouts before the blocks in IndexedDB (^1254)', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('writes a project of the layout with a record for each row (^1250) in blocks when it is read', async () => {
    const s = new IndexedDbStorage();
    await s.list();
    const db = await raw();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(['projects', 'nodes', 'edges'], 'readwrite');
      tx.objectStore('projects').put({ id: 'r', header: headerOf(file('Rows')) });
      for (const [id, x, y, th] of file().nodes)
        tx.objectStore('nodes').put({ p: 'r', id, x, y, th });
      for (const [id, start, end, radius, lane] of file().edges)
        tx.objectStore('edges').put({ p: 'r', id, start, end, radius, lane });
      tx.oncomplete = () => resolve();
    });
    expect(await s.load('r')).toEqual(file('Rows'));
    expect(await all(db.transaction('nodes').objectStore('nodes').count())).toBe(0);
    expect(await all(db.transaction('nodeblocks').objectStore('nodeblocks').count())).toBe(1);
  });

  it('finds the nodes of a chunk by one exact lookup of their cell, with their rows (^1250)', async () => {
    const s = new IndexedDbStorage();
    await s.put({ id: 'a', file: file() });
    await buildIndex(s, 'a');
    // The fixture has nodes at (1, 5), (20, -3) and (30, 9) meters: the chunks (0,0), (0,-1) and (0,0).
    expect((await s.nodesInChunk('a', 0, 0, INDEX_VERSION)).map((n) => n[0]).sort()).toEqual([
      0, 5,
    ]);
    expect(await s.nodesInChunk('a', 0, -1, INDEX_VERSION)).toEqual([[1, 20000, -3000, 1.5]]);
    expect(await s.nodesInChunk('a', 3, 3, INDEX_VERSION)).toEqual([]);
    expect(await s.nodesInChunk('a', 0, 0, INDEX_VERSION + 1)).toEqual([]);
  });
});

describe('a project of the first layout in IndexedDB', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('a project of the first layout (the whole file in one record) is listed, and written in the new layout when it is read', async () => {
    const s = new IndexedDbStorage();
    await s.list();
    const db = await raw();
    await new Promise<void>((resolve) => {
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').put({ id: 'old', file: file('Old') });
      tx.oncomplete = () => resolve();
    });
    expect((await s.list())[0]!.file.title).toBe('Old');
    expect(await s.load('old')).toEqual(file('Old'));
    expect(await all(db.transaction('nodeblocks').objectStore('nodeblocks').count())).toBe(1);
    const header = headerOf(file('Old'));
    await s.patch('old', header, { ...none, nodes: [[7, 0, 0, 0]] });
    expect(((await s.load('old')) as ProjectFile).nodes.map((n) => n[0])).toEqual([0, 1, 5, 7]);
    expect(
      await all(db.transaction('projects').objectStore('projects').get('old')),
    ).not.toHaveProperty('file');
  });

  it('a damaged file stays in one record so that it can be refused when it is opened', async () => {
    const s = new IndexedDbStorage();
    const damaged = { ...file(), nodes: 'no list' } as unknown as ProjectFile;
    await s.put({ id: 'bad', file: damaged });
    expect(await s.load('bad')).toEqual(damaged);
    expect((await s.list())[0]!.file.title).toBe('A');
  });
});

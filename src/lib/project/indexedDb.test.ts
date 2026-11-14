import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { file, none } from '../testing/storageFixtures';
import type { ProjectFile } from './file';
import { IndexedDbStorage } from './indexedDb';
import { headerOf } from './storage';

globalThis.IDBKeyRange = IDBKeyRange;

const raw = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open('modelcity', 2);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
const all = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve) => {
    r.onsuccess = () => resolve(r.result);
  });

describe('the layout in IndexedDB', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('finds nodes by a range of x or of y and segments by their nodes, with no chunks', async () => {
    const s = new IndexedDbStorage();
    await s.put({ id: 'a', file: file() });
    await s.put({ id: 'b', file: file() });
    const db = await raw();
    const nodes = db.transaction('nodes').objectStore('nodes');
    const inX = await all(
      nodes.index('x').getAll(IDBKeyRange.bound(['a', 1000], ['a', 20000], true, false)),
    );
    expect(inX.map((n) => n.id)).toEqual([1]);
    const inY = await all(nodes.index('y').getAll(IDBKeyRange.bound(['a', 0], ['a', 10000])));
    expect(inY.map((n) => n.id).sort()).toEqual([0, 5]);
    const edges = db.transaction('edges').objectStore('edges');
    expect((await all(edges.index('start').getAll(['a', 1]))).map((e) => e.id)).toEqual([3]);
    expect((await all(edges.index('end').getAll(['a', 1]))).map((e) => e.id)).toEqual([0]);
    expect(
      JSON.stringify(await all(db.transaction('nodes').objectStore('nodes').getAll())),
    ).not.toMatch(/chunk|cell/);
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
    expect(await all(db.transaction('nodes').objectStore('nodes').count())).toBe(3);
    const header = headerOf(file('Old'));
    await s.patch('old', header, { ...none, nodes: [[7, 0, 0, 0]] });
    expect(((await s.load('old')) as ProjectFile).nodes.map((n) => n[0])).toEqual([0, 1, 5, 7]);
    const rows = await all(db.transaction('nodes').objectStore('nodes').getAll());
    expect(rows).toHaveLength(4);
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

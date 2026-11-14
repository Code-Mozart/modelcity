import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProjectFile } from './file';
import { file, none } from '../testing/storageFixtures';
import { IndexedDbStorage } from './indexedDb';
import { headerOf, MemoryStorage, type ProjectStorage } from './storage';

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

describe.each(storages)('the storage of the projects: %s', (_name, make) => {
  let s: ProjectStorage;
  beforeEach(() => {
    s = make();
  });

  it('lists headers without the map and loads the whole project', async () => {
    await s.put({ id: 'a', file: file() });
    const [listed] = await s.list();
    expect(listed!.id).toBe('a');
    expect(listed!.file).not.toHaveProperty('nodes');
    expect(listed!.file).toMatchObject({ title: 'A', nextNodeId: 6 });
    expect(await s.load('a')).toEqual(file());
    expect(await s.load('none')).toBeUndefined();
  });

  it('a header-only patch (a rename) leaves the map alone', async () => {
    await s.put({ id: 'a', file: file() });
    const header = headerOf(file('Renamed'));
    await s.patch('a', header);
    expect(await s.load('a')).toEqual(file('Renamed'));
  });
});

describe.each(storages)('patching a stored project: %s', (_name, make) => {
  let s: ProjectStorage;
  beforeEach(() => {
    s = make();
  });

  it('a patch writes the header and only what changed; ids with gaps stay', async () => {
    await s.put({ id: 'a', file: file() });
    const header = headerOf(file('B'));
    await s.patch(
      'a',
      { ...header, nextNodeId: 7 },
      {
        nodes: [
          [1, 21000, -3000, 1.5],
          [6, 0, 0, 0],
        ],
        edges: [[4, 6, 0, null, 1]],
        removedNodes: [5],
        removedEdges: [3],
      },
    );
    const loaded = (await s.load('a')) as ProjectFile;
    expect([loaded.title, loaded.nextNodeId]).toEqual(['B', 7]);
    expect(loaded.nodes.map((n) => n[0]).sort()).toEqual([0, 1, 6]);
    expect(loaded.nodes.find((n) => n[0] === 1)).toEqual([1, 21000, -3000, 1.5]);
    expect(loaded.edges.map((e) => e[0])).toEqual([0, 4]);
  });

  it('keeps projects apart and removes one with its map', async () => {
    await s.put({ id: 'a', file: file('A') });
    await s.put({ id: 'b', file: file('B') });
    await s.patch('a', file('A'), { ...none, removedNodes: [0] });
    await s.remove('b');
    expect((await s.list()).map((p) => p.id)).toEqual(['a']);
    expect(((await s.load('a')) as ProjectFile).nodes).toHaveLength(2);
    expect(await s.load('b')).toBeUndefined();
  });
});

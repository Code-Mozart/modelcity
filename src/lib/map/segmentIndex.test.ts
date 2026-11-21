import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { IndexedDbStorage } from '../project/indexedDb';
import type { ProjectFile } from '../project/file';
import {
  headerOf,
  MemoryStorage,
  type EdgeRow,
  type NodeRow,
  type ProjectStorage,
} from '../project/storage';
import { file } from '../testing/storageFixtures';
import { buildIndex, INDEX_VERSION, isComplete, MAX_CELLS, recordOf } from './segmentIndex';

globalThis.IDBKeyRange = IDBKeyRange;

const sample: NodeRow[] = [
  [0, 100_000, 0, 0],
  [1, 300_000, 50_000, 2.3],
  [2, 300_000, 150_000, 1.5708],
];

describe('the record of a segment (^1239)', () => {
  /** The boxes of two curves, whole millimeters. If a change of the curve code changes them, `INDEX_VERSION` is to be raised: every index that exists is made again. */
  it(`holds the boxes of the curves of version ${INDEX_VERSION}`, () => {
    expect(recordOf([0, 0, 1, null, 1], sample[0]!, sample[1]!)).toEqual({
      id: 0,
      box: [100_000, 0, 307_631, 50_000],
      cells: [
        [0, -1],
        [1, -1],
        [0, 0],
        [1, 0],
      ],
    });
    expect(recordOf([1, 1, 2, 12_500, 1], sample[1]!, sample[2]!)).toEqual({
      id: 1,
      box: [273_827, 50_000, 300_001, 150_000],
      cells: [[1, 0]],
    });
    expect(INDEX_VERSION).toBe(2);
  });

  it('lists the chunks a box touches, also those whose edge it only touches', () => {
    // A line from 10 m to 256 m: its box ends on the line between the chunks 0 and 1.
    const r = recordOf([0, 0, 1, null, 1], [0, 10_000, 100_000, 0], [1, 256_000, 100_000, 0]);
    expect(r.cells).toContainEqual([1, 0]);
    expect(r.cells).toContainEqual([0, 0]);
  });

  it('a box of too many chunks is wide: returned for every chunk', () => {
    const far = (MAX_CELLS + 1) * 256_000;
    expect(recordOf([0, 0, 1, null, 1], [0, 0, 0, 0], [1, far, 0, 0]).cells).toBe('wide');
  });
});

const row = (id: number, x: number, y: number): NodeRow => [id, x * 1000, y * 1000, 0];

/** A road of 1200 segments along x, 40 m apart: many pages. */
const road = (): ProjectFile => ({
  ...file(),
  nodes: Array.from({ length: 1201 }, (_, i) => row(i, i * 40, 0)),
  edges: Array.from({ length: 1200 }, (_, i): EdgeRow => [i, i, i + 1, null, 1]),
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

describe.each(storages)('building the segment index: %s', (_name, make) => {
  it('makes a record for every segment, counted as it goes, and then it is complete', async () => {
    const s = make();
    await s.put({ id: 'r', file: road() });
    expect(await isComplete(s, 'r')).toBe(false);
    const seen: number[] = [];
    await buildIndex(s, 'r', { page: 300, onProgress: (done, total) => seen.push(done / total) });
    expect(await isComplete(s, 'r')).toBe(true);
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(1);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(seen.length).toBeGreaterThan(3);
  });

  it('a stopped build goes on where it was, and writes only what is missing', async () => {
    const s = make();
    await s.put({ id: 'r', file: road() });
    const control = new AbortController();
    await expect(
      buildIndex(s, 'r', {
        page: 300,
        signal: control.signal,
        onProgress: (done) => done > 0 && control.abort(),
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    const half = (await s.indexStatus('r', INDEX_VERSION)).indexed;
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1200);
    const write = vi.spyOn(s, 'putIndex');
    await buildIndex(s, 'r');
    expect(await isComplete(s, 'r')).toBe(true);
    expect(write.mock.calls.reduce((n, c) => n + c[2].length, 0)).toBe(1200 - half);
  });

  it('is not complete for another version, and an index of another version is made again', async () => {
    const s = make();
    await s.put({ id: 'r', file: road() });
    await buildIndex(s, 'r', { version: 7 });
    expect(await isComplete(s, 'r', 7)).toBe(true);
    expect(await isComplete(s, 'r')).toBe(false);
  });
});

describe.each(storages)('a project that cannot be indexed: %s', (_name, make) => {
  it('refuses a project with a segment that has no node, saying which (^206)', async () => {
    const s = make();
    await s.put({ id: 'r', file: { ...road(), edges: [[0, 0, 5000, null, 1]] } });
    await expect(buildIndex(s, 'r')).rejects.toMatchObject({ hat: '^206' });
  });
});

describe.each(storages)('when the index counts as complete (^1253): %s', (_name, make) => {
  it('only when a build has gone through to its end, and not after the map is changed', async () => {
    const s = make();
    await s.put({ id: 'r', file: road() });
    expect(await isComplete(s, 'r')).toBe(false);
    const control = new AbortController();
    await buildIndex(s, 'r', {
      page: 300,
      signal: control.signal,
      onProgress: (d) => d > 0 && control.abort(),
    }).catch(() => {});
    expect(await isComplete(s, 'r')).toBe(false);
    await buildIndex(s, 'r');
    expect(await isComplete(s, 'r')).toBe(true);
    expect(await isComplete(s, 'r', INDEX_VERSION + 1)).toBe(false);
    await s.patch('r', headerOf(file()), {
      nodes: [[9999, 0, 0, 0]],
      edges: [],
      removedNodes: [],
      removedEdges: [],
    });
    expect(await isComplete(s, 'r')).toBe(false);
  });
});

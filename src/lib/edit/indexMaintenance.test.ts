import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { buildIndex, INDEX_VERSION } from '../map/segmentIndex';
import { IndexedDbStorage } from '../project/indexedDb';
import { MemoryStorage, type EdgeRow, type NodeRow, type ProjectStorage } from '../project/storage';
import { file } from '../testing/storageFixtures';
import { toMapChange, inverse } from './change';
import { deleteNodes, type RowSource } from './deleteNodes';
import { indexChangeOf } from './indexChange';

globalThis.IDBKeyRange = IDBKeyRange;

function dice(seed: number) {
  let s = seed;
  return (n: number) =>
    Math.floor(((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) * n);
}

const sourceOf = (storage: ProjectStorage): RowSource => ({
  nodes: (ids) => storage.nodesByIds('p', ids),
  edgesAt: (ids) => storage.edgesOf('p', ids),
});

/** What the index says for the chunks round the map: for each chunk the segments and the nodes it lists. */
async function seen(storage: ProjectStorage) {
  const out: Record<string, string> = {};
  for (let cy = -4; cy <= 4; cy++)
    for (let cx = -4; cx <= 4; cx++) {
      const [edges, nodes] = await Promise.all([
        storage.edgesInChunk('p', cx, cy, INDEX_VERSION),
        storage.nodesInChunk('p', cx, cy, INDEX_VERSION),
      ]);
      const key = (rows: (EdgeRow | NodeRow)[]) =>
        rows
          .map((r) => r[0])
          .sort((a, b) => a - b)
          .join();
      out[`${cx},${cy}`] = `${key(edges)}|${key(nodes)}`;
    }
  return out;
}

/** A map with a rebuilt index, from the rows that are stored in another storage. */
async function rebuilt(storage: ProjectStorage, Storage: new () => ProjectStorage) {
  const copy = new Storage();
  await copy.put({ id: 'p', file: (await storage.load('p')) as never });
  await buildIndex(copy, 'p');
  return copy;
}

async function randomMap(
  rand: (n: number) => number,
): Promise<{ nodes: NodeRow[]; edges: EdgeRow[] }> {
  const count = 4 + rand(14);
  const nodes: NodeRow[] = Array.from({ length: count }, (_, i) => [
    i,
    (rand(1200) - 600) * 1000,
    (rand(1200) - 600) * 1000,
    (rand(628) / 100) * 1,
  ]);
  const edges: EdgeRow[] = [];
  for (let i = 0; i < count; i++)
    edges.push([
      edges.length,
      i,
      (i + 1 + rand(count - 1)) % count,
      rand(3) ? null : 1000 * (5 + rand(30)),
      1,
    ]);
  return { nodes, edges };
}

/** One random map: three deletes, each checked against the index built again, then all undone, each checked, and the map is as it was. */
async function oneRun(Storage: new () => ProjectStorage, rand: (n: number) => number) {
  globalThis.indexedDB = new IDBFactory();
  const storage = new Storage();
  const { nodes, edges } = await randomMap(rand);
  await storage.put({ id: 'p', file: { ...file(), nodes, edges } });
  await buildIndex(storage, 'p');
  const same = async () =>
    expect(await seen(storage)).toEqual(await seen(await rebuilt(storage, Storage)));
  const done = [];
  for (let k = 0; k < 3; k++) {
    const ids = Array.from({ length: 1 + rand(3) }, () => rand(nodes.length));
    const change = await deleteNodes(sourceOf(storage), ids);
    await storage.patch('p', file(), toMapChange(change), indexChangeOf(change));
    done.push(change);
    expect(await storage.indexedVersion('p')).toBe(INDEX_VERSION);
    await same();
  }
  for (const change of done.reverse()) {
    const back = inverse(change);
    await storage.patch('p', file(), toMapChange(back), indexChangeOf(back));
    await same();
  }
  const f = (await storage.load('p')) as unknown as { nodes: NodeRow[]; edges: EdgeRow[] };
  expect([...f.nodes].sort((a, b) => a[0] - b[0])).toEqual(nodes);
}

describe.each([
  ['memory', MemoryStorage],
  ['IndexedDB', IndexedDbStorage],
] as const)(
  'the index kept current by an edit equals the index built again (^1260), %s',
  (_, Storage) => {
    it('after random deletes, and after undoing them', { timeout: 120_000 }, async () => {
      const rand = dice(17);
      for (let run = 0; run < 25; run++) await oneRun(Storage, rand);
    });

    it('a change without what to do with the index throws it away, as before', async () => {
      globalThis.indexedDB = new IDBFactory();
      const storage = new Storage();
      await storage.put({
        id: 'p',
        file: {
          ...file(),
          nodes: [
            [0, 0, 0, 0],
            [1, 5000, 0, 0],
          ],
          edges: [[0, 0, 1, null, 1]],
        },
      });
      await buildIndex(storage, 'p');
      const change = await deleteNodes(sourceOf(storage), [1]);
      await storage.patch('p', file(), toMapChange(change));
      expect(await storage.indexedVersion('p')).toBeUndefined();
    });
  },
);

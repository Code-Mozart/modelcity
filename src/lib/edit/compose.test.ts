import { describe, expect, it } from 'vitest';
import { applyChange, MemoryStorage, type EdgeRow, type NodeRow } from '../project/storage';
import { file } from '../testing/storageFixtures';
import { compose, inverse, toMapChange } from './change';
import { branchEdgesOf } from './branchRows';
import { deleteNodes } from './deleteNodes';

const node = (id: number): NodeRow => [id, id * 1000, 0, 0];
const edge = (id: number, a: number, b: number, radius: number | null = null): EdgeRow => [
  id,
  a,
  b,
  radius,
  1,
];

function dice(seed: number) {
  let s = seed;
  return (n: number) =>
    Math.floor(((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) * n);
}

async function storageOf(nodes: NodeRow[], edges: EdgeRow[]) {
  const storage = new MemoryStorage();
  await storage.put({ id: 'p', file: { ...file(), nodes, edges } });
  return {
    storage,
    source: {
      nodes: (ids: number[]) => storage.nodesByIds('p', ids),
      edgesAt: (ids: number[]) => storage.edgesOf('p', ids),
    },
  };
}

const sorted = <R extends [number, ...unknown[]]>(r: R[]) => [...r].sort((a, b) => a[0] - b[0]);

describe('several changes as one (^1260)', () => {
  it('written at once they give the same map as written one after the other, and undone at once the map before (random maps)', async () => {
    const rand = dice(9);
    for (let run = 0; run < 100; run++) await oneRun(rand);
  });
});

/** Three deletes on a random map: written one after the other, written as one, and all undone as one. */
async function oneRun(rand: (n: number) => number) {
  const count = 4 + rand(10);
  const nodes = Array.from({ length: count }, (_, i) => node(i));
  const edges: EdgeRow[] = [];
  for (let i = 0; i < count; i++)
    edges.push(edge(i, i, (i + 1 + rand(count - 1)) % count, rand(2) ? 3000 : null));
  const { storage, source } = await storageOf(nodes, edges);
  const steps = [];
  let state = { ...file(), nodes, edges };
  for (let k = 0; k < 3; k++) {
    const change = await deleteNodes(source, [rand(count), rand(count)]);
    await storage.patch('p', file(), toMapChange(change));
    state = applyChange(state, file(), toMapChange(change));
    steps.push(change);
  }
  const together = applyChange({ ...file(), nodes, edges }, file(), toMapChange(compose(steps)));
  expect(sorted(together.nodes)).toEqual(sorted(state.nodes));
  expect(sorted(together.edges)).toEqual(sorted(state.edges));
  const undone = compose([...steps].reverse().map(inverse));
  const back = applyChange(together, file(), toMapChange(undone));
  expect(sorted(back.nodes)).toEqual(nodes);
  expect(sorted(back.edges)).toEqual(sorted(edges));
}

describe('the branch of a segment in the storage (^160)', () => {
  it('is followed to its end however long it is, and stops at a split', async () => {
    const nodes = Array.from({ length: 40 }, (_, i) => node(i));
    const chain = Array.from({ length: 39 }, (_, i) => edge(i, i, i + 1));
    const { source } = await storageOf([...nodes, node(100)], [...chain, edge(100, 20, 100)]);
    // The branch of segment 0 runs from node 0 to node 20, where a segment splits off.
    expect((await branchEdgesOf(source, chain[0]!)).map((e) => e[0]).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i),
    );
    expect(await branchEdgesOf(source, chain[30]!)).toHaveLength(19);
  });
});

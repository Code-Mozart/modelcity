import { describe, expect, it } from 'vitest';
import {
  applyChange,
  MemoryStorage,
  type EdgeRow,
  type NodeRow,
  type ProjectStorage,
} from '../project/storage';
import { file } from '../testing/storageFixtures';
import { inverse, toMapChange } from './change';
import { deleteEdges, deleteNodes, type RowSource } from './deleteNodes';

const node = (id: number): NodeRow => [id, id * 1000, 0, 0];
const edge = (id: number, a: number, b: number, radius: number | null = null): EdgeRow => [
  id,
  a,
  b,
  radius,
  1,
];

const sourceOf = (storage: ProjectStorage, id = 'p'): RowSource => ({
  nodes: (ids) => storage.nodesByIds(id, ids),
  edgesAt: (ids) => storage.edgesOf(id, ids),
});

async function map(nodes: NodeRow[], edges: EdgeRow[]) {
  const storage = new MemoryStorage();
  await storage.put({ id: 'p', file: { ...file(), nodes, edges } });
  return storage;
}

/** What `main` does (graph.ts removeNode and removeNodes, ^322, ^434): the reference that the rows are compared with. */
function reference(nodes: NodeRow[], edges: EdgeRow[], ids: number[], keep: number | null) {
  let [ns, es] = [nodes, edges];
  for (const id of ids) {
    const [inE, outE] = [es.filter((e) => e[2] === id), es.filter((e) => e[1] === id)];
    const rest = es.filter((e) => e[1] !== id && e[2] !== id);
    const join =
      inE.length === 1 &&
      outE.length === 1 &&
      inE[0]![1] !== id &&
      outE[0]![2] !== id &&
      inE[0]![1] !== outE[0]![2];
    const joined: EdgeRow[] = join ? [[inE[0]![0], inE[0]![1], outE[0]![2], null, inE[0]![4]]] : [];
    ns = ns.filter((n) => n[0] !== id);
    es = [...rest, ...joined];
  }
  const used = new Set(es.flatMap((e) => [e[1], e[2]]));
  return { nodes: ns.filter((n) => used.has(n[0]) || n[0] === keep), edges: es };
}

const byId = <R extends [number, ...unknown[]]>(rows: R[]) => [...rows].sort((a, b) => a[0] - b[0]);

/** The map in the storage after a change. */
async function after(storage: ProjectStorage, change: Awaited<ReturnType<typeof deleteNodes>>) {
  const f = (await storage.load('p')) as { nodes: NodeRow[]; edges: EdgeRow[] };
  return applyChange({ ...file(), nodes: f.nodes, edges: f.edges }, file(), toMapChange(change));
}

describe('delete nodes: what main does (^434, ^322, ^749)', () => {
  it('a node in the middle of a road is dissolved: the segment in runs on, radius automatic, the segment out goes', async () => {
    const storage = await map(
      [node(1), node(2), node(3)],
      [edge(10, 1, 2, 5000), edge(11, 2, 3, 7000)],
    );
    const result = await after(storage, await deleteNodes(sourceOf(storage), [2]));
    expect(byId(result.nodes)).toEqual([node(1), node(3)]);
    expect(result.edges).toEqual([[10, 1, 3, null, 1]]);
  });

  it('a node where roads meet goes with all its segments, and the nodes left alone go too', async () => {
    const storage = await map(
      [node(1), node(2), node(3), node(4)],
      [edge(10, 1, 2), edge(11, 3, 2), edge(12, 2, 4)],
    );
    const result = await after(storage, await deleteNodes(sourceOf(storage), [2]));
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('the end of a road goes with its segment, and the other end stays if it has more segments', async () => {
    const storage = await map([node(1), node(2), node(3)], [edge(10, 1, 2), edge(11, 2, 3)]);
    const result = await after(storage, await deleteNodes(sourceOf(storage), [3]));
    expect(byId(result.nodes)).toEqual([node(1), node(2)]);
    expect(result.edges).toEqual([edge(10, 1, 2)]);
  });

  it('the node to keep stays when it is left alone (the road being drawn)', async () => {
    const storage = await map([node(1), node(2)], [edge(10, 1, 2)]);
    const result = await after(storage, await deleteNodes(sourceOf(storage), [2], 1));
    expect(result.nodes).toEqual([node(1)]);
    expect(result.edges).toEqual([]);
  });

  it('a ring of two does not join into a segment from a node to itself', async () => {
    const storage = await map([node(1), node(2)], [edge(10, 1, 2), edge(11, 2, 1)]);
    const result = await after(storage, await deleteNodes(sourceOf(storage), [1]));
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});

describe('delete nodes: what it reports (^434, ^1260)', () => {
  it('a node that is not there is nothing to delete', async () => {
    const storage = await map([node(1), node(2)], [edge(10, 1, 2)]);
    const change = await deleteNodes(sourceOf(storage), [99]);
    expect(change.nodes).toEqual([]);
    expect(change.edges).toEqual([]);
  });

  it('knows the ends of the segments it changed, which are not changed themselves (the context)', async () => {
    const storage = await map([node(1), node(2), node(3)], [edge(10, 1, 2), edge(11, 2, 3)]);
    const change = await deleteNodes(sourceOf(storage), [2]);
    expect(byId(change.context)).toEqual([node(1), node(3)]);
  });

  it('turned round it is what undoes it', async () => {
    const storage = await map(
      [node(1), node(2), node(3)],
      [edge(10, 1, 2, 5000), edge(11, 2, 3, 7000)],
    );
    const change = await deleteNodes(sourceOf(storage), [2]);
    const gone = await after(storage, change);
    const back = applyChange(gone, file(), toMapChange(inverse(change)));
    expect(byId(back.nodes)).toEqual([node(1), node(2), node(3)]);
    expect(byId(back.edges)).toEqual([edge(10, 1, 2, 5000), edge(11, 2, 3, 7000)]);
  });
});

/** Numbers that are the same for every run, so that a failure can be repeated. */
function dice(seed: number) {
  let s = seed;
  return (n: number) =>
    Math.floor(((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) * n);
}

describe('delete nodes is what main does, on random maps (^434)', () => {
  it('the nodes and segments that are left are the same, for any nodes deleted, in any order', async () => {
    const rand = dice(5);
    for (let run = 0; run < 150; run++) {
      const count = 3 + rand(12);
      const nodes = Array.from({ length: count }, (_, i) => node(i));
      const edges: EdgeRow[] = [];
      for (let i = 0; i < count; i++) {
        // Every node has a segment: a map has no node that is alone.
        const other = (i + 1 + rand(count - 1)) % count;
        edges.push(
          rand(2)
            ? edge(edges.length, i, other, rand(2) ? 1000 * rand(9) : null)
            : edge(edges.length, other, i),
        );
      }
      for (let i = 0; i < rand(count); i++) {
        const [a, b] = [rand(count), rand(count)];
        if (a !== b) edges.push(edge(edges.length, a, b));
      }
      const ids = Array.from({ length: 1 + rand(4) }, () => rand(count));
      const keep = rand(4) === 0 ? rand(count) : null;
      const storage = await map(nodes, edges);
      const got = await after(storage, await deleteNodes(sourceOf(storage), ids, keep));
      const want = reference(nodes, edges, ids, keep);
      expect(byId(got.nodes)).toEqual(byId(want.nodes));
      expect(byId(got.edges)).toEqual(byId(want.edges));
    }
  });
});

describe('delete segments (^920, ^160)', () => {
  it('a segment goes and its ends stay when they have other segments, else they go', async () => {
    const storage = await map([node(1), node(2), node(3)], [edge(10, 1, 2), edge(11, 2, 3)]);
    const result = await after(storage, await deleteEdges(sourceOf(storage), [edge(10, 1, 2)]));
    expect(byId(result.nodes)).toEqual([node(2), node(3)]);
    expect(result.edges).toEqual([edge(11, 2, 3)]);
  });

  it('all the segments of a branch go with the nodes in between', async () => {
    const storage = await map(
      [node(1), node(2), node(3), node(4)],
      [edge(10, 1, 2), edge(11, 2, 3), edge(12, 3, 4)],
    );
    const result = await after(
      storage,
      await deleteEdges(sourceOf(storage), [edge(10, 1, 2), edge(11, 2, 3)]),
    );
    expect(byId(result.nodes)).toEqual([node(3), node(4)]);
    expect(result.edges).toEqual([edge(12, 3, 4)]);
  });
});

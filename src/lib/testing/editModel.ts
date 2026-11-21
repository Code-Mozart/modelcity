import { expect } from 'vitest';
import { buildIndex, INDEX_VERSION } from '../map/segmentIndex';
import { MapMemory } from '../map/mapMemory.svelte';
import { MemoryStorage, type EdgeRow, type NodeRow, type ProjectStorage } from '../project/storage';
import { branchEdgesRef, removeNodesRef, removeSegmentsRef, type Rows } from './mainRemoval';
import type { editing } from './editHarness';
import { file } from './storageFixtures';

/** What the model of the editor is tested with (^1260): numbers that are the same for every run, random maps, the model itself, and the checks of what the editor left behind. */
export type Harness = Awaited<ReturnType<typeof editing>>;

export function dice(seed: number) {
  let s = seed;
  return (n: number) =>
    Math.floor(((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) * n);
}
export type Dice = ReturnType<typeof dice>;

export const sorted = <R extends [number, ...unknown[]]>(rows: R[]) =>
  [...rows].sort((a, b) => a[0] - b[0]);

export const sortedRows = (r: Rows): Rows => ({ nodes: sorted(r.nodes), edges: sorted(r.edges) });

/** A random map of chains of nodes (so there are branches, splits and nodes to dissolve) with some segments across. */
export function randomMap(rand: Dice): Rows {
  const count = 6 + rand(10);
  const nodes: NodeRow[] = Array.from({ length: count }, (_, i) => [
    i,
    (rand(800) - 400) * 1000,
    (rand(800) - 400) * 1000,
    rand(628) / 100,
  ]);
  const edges: EdgeRow[] = [];
  const radius = () => (rand(3) ? null : 1000 * (4 + rand(40)));
  for (let i = 0; i + 1 < count; i++)
    if (rand(5)) edges.push([edges.length, i, i + 1, radius(), 1]);
  for (let k = rand(4); k > 0; k--) {
    const [a, b] = [rand(count), rand(count)];
    if (a !== b) edges.push([edges.length, a, b, radius(), 1]);
  }
  const used = new Set(edges.flatMap((e) => [e[1], e[2]]));
  return { nodes: nodes.filter((n) => used.has(n[0])), edges };
}

export const rowsOf = async (storage: ProjectStorage): Promise<Rows> =>
  sortedRows((await storage.load('p')) as unknown as Rows);

const ids = (rows: { 0: number }[]) =>
  rows
    .map((r) => r[0])
    .sort((a, b) => a - b)
    .join();

/** What the index says for the chunks round the map. */
async function seen(storage: ProjectStorage) {
  const out: string[] = [];
  for (let cy = -5; cy <= 5; cy++)
    for (let cx = -5; cx <= 5; cx++) {
      const [e, n] = await Promise.all([
        storage.edgesInChunk('p', cx, cy, INDEX_VERSION),
        storage.nodesInChunk('p', cx, cy, INDEX_VERSION),
      ]);
      out.push(`${cx},${cy}:${ids(e)}|${ids(n)}`);
    }
  return out;
}

/** What the chunks of memory hold, row by row (the far ends that no segment of the chunk is at are not part of it). */
export const held = (memory: MapMemory) =>
  Object.fromEntries(
    [...memory.chunks]
      .filter(([, s]) => s.status === 'ready')
      .map(([id, s]) => {
        const c = (s as { chunk: { nodes: NodeRow[]; edges: EdgeRow[]; ends: NodeRow[] } }).chunk;
        const key = (rows: unknown[]) =>
          rows
            .map((r) => JSON.stringify(r))
            .sort()
            .join(';');
        const ends = c.ends.filter((n) => c.edges.some((e) => e[1] === n[0] || e[2] === n[0]));
        return [id, `${key(c.nodes)}|${key(c.edges)}|${key(ends)}`];
      }),
  );

/** The storage, its index and the chunks in memory are what the model says (the index is compared with one built again, and with its count of records). */
export async function checkAgainst(e: Harness, model: Rows, label: string) {
  expect(await rowsOf(e.storage), label).toEqual(model);
  expect(await e.storage.indexedVersion('p')).toBe(INDEX_VERSION);
  const copy = new MemoryStorage();
  await copy.put({ id: 'p', file: { ...file(), ...model } });
  await buildIndex(copy, 'p');
  expect(await seen(e.storage), `index, ${label}`).toEqual(await seen(copy));
  expect(await e.storage.indexStatus('p', INDEX_VERSION), `records, ${label}`).toEqual(
    await copy.indexStatus('p', INDEX_VERSION),
  );
  const fresh = new MapMemory(copy);
  fresh.open('p');
  fresh.show({ cx0: -2, cx1: 2, cy0: -2, cy1: 2 });
  await e.settle();
  expect(held(e.memory), `chunks, ${label}`).toEqual(held(fresh));
}

/** The rows and selection at one moment: what a step goes back to. */
export interface Snap {
  rows: Rows;
  selection: number[];
}

/** What the history should be, as stacks of what was before and what was undone: the model of undo and redo (one step at a time). */
export class Stacks {
  now: Snap;
  past: Snap[] = [];
  future: Snap[] = [];

  constructor(start: Rows) {
    this.now = { rows: sortedRows(start), selection: [] };
  }

  /** A step was taken: what was there is the past, what was undone is forgotten. */
  took(next: Snap) {
    this.past.push(this.now);
    this.future.length = 0;
    this.now = next;
  }

  undo(): boolean {
    const back = this.past.pop();
    if (back) [this.future, this.now] = [[...this.future, this.now], back];
    return back !== undefined;
  }

  redo(): boolean {
    const next = this.future.pop();
    if (next) [this.past, this.now] = [[...this.past, this.now], next];
    return next !== undefined;
  }
}

/** What a delete does to the rows, by the rules of main: null when the model has nothing to delete. */
export function after(
  op: 'nodes' | 'segment' | 'branch',
  rows: Rows,
  rand: Dice,
): { rows: Rows; ids: number[]; edge: EdgeRow | null } | null {
  if (op === 'nodes' && rows.nodes.length) {
    const picked = Array.from(
      { length: 1 + rand(3) },
      () => rows.nodes[rand(rows.nodes.length)]![0],
    );
    return { rows: sortedRows(removeNodesRef(rows, picked)), ids: picked, edge: null };
  }
  if (op !== 'nodes' && rows.edges.length) {
    const edge = rows.edges[rand(rows.edges.length)]!;
    const gone = op === 'segment' ? [edge[0]] : branchEdgesRef(rows, edge[0]);
    return { rows: sortedRows(removeSegmentsRef(rows, gone)), ids: [], edge };
  }
  return null;
}

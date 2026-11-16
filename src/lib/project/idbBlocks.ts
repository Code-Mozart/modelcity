import { NODES, EDGES, NODE_BLOCKS, EDGE_BLOCKS } from './idbSchema';
import { ofProject, request } from './idbRows';
import type { MapChange } from './storage';

/**
 * The rows of a project are stored in blocks (^1254): a block holds the rows whose ids are in the
 * same range of `BLOCK` ids, so that 100,000 rows are a thousand puts instead of 100,000 (a put costs
 * the same whatever it holds, ^1253). A record is `{p, id: block number, rows}`; the rows of a block
 * are in the order of their ids.
 */
export const BLOCK = 128;

type Row = [number, ...unknown[]];

export const blockOf = (id: number) => Math.floor(id / BLOCK);

/** The rows of the blocks that hold these ids, the ones that are there. */
export const rowsOfBlocks = <R extends Row>(blocks: { rows: R[] }[]) =>
  blocks.flatMap((b) => b.rows);

/** The rows by the block they belong to. */
export function byBlock<R extends Row>(rows: R[]): Map<number, R[]> {
  const out = new Map<number, R[]>();
  for (const r of rows) {
    const list = out.get(blockOf(r[0]));
    if (list) list.push(r);
    else out.set(blockOf(r[0]), [r]);
  }
  return out;
}

/** What a record of a store of blocks holds: for segments also the nodes at their ends, as keys of an index (`edgesOf`). */
export const blockRecord = <R extends Row>(p: string, b: number, rows: R[], ends: boolean) => ({
  p,
  id: b,
  rows,
  ...(ends
    ? {
        ends: rows.flatMap((r) => [
          [p, r[1]],
          [p, r[2]],
        ]),
      }
    : {}),
});

/** A block that gets `changed` rows (they replace rows of the same id) and loses the rows `removed`: its new rows, in the order of their ids. */
export function merged<R extends Row>(old: R[], changed: R[], removed: Set<number>): R[] {
  const now = new Map(changed.map((r) => [r[0], r]));
  const kept = old.filter((r) => !removed.has(r[0])).map((r) => now.get(r[0]) ?? r);
  const have = new Set(kept.map((r) => r[0]));
  return [...kept, ...changed.filter((r) => !have.has(r[0]))].sort((a, b) => a[0] - b[0]);
}

/**
 * Apply a change to the blocks of a store: each block that it touches is read, changed and written
 * (or deleted when it is empty). With `fresh` a row whose id is there already is an error named
 * `ConstraintError`, and nothing is written (the transaction is aborted by the caller).
 */
export async function changeBlocks<R extends Row>(
  store: IDBObjectStore,
  p: string,
  change: { changed: R[]; removed: number[]; ends: boolean; fresh?: boolean },
) {
  const changed = byBlock(change.changed);
  const removed = byBlock(change.removed.map((id): Row => [id]));
  const touched = [...new Set([...changed.keys(), ...removed.keys()])];
  const old = await Promise.all(
    touched.map((b) => request<{ rows: R[] } | undefined>(store.get([p, b]))),
  );
  touched.forEach((b, i) => {
    const before = old[i]?.rows ?? [];
    const rows = changed.get(b) ?? [];
    const seen = new Set(before.map((o) => o[0]));
    if (
      change.fresh &&
      (rows.some((r) => seen.has(r[0])) || new Set(rows.map((r) => r[0])).size < rows.length)
    )
      throw Object.assign(new Error('two rows have the same id'), { name: 'ConstraintError' });
    const after = merged(before, rows, new Set((removed.get(b) ?? []).map((r) => r[0])));
    if (after.length) store.put(blockRecord(p, b, after, change.ends));
    else store.delete([p, b]);
  });
}

/** The rows after id `after`, `limit` of them at most, in the order of their ids. */
export async function rowsAfter<R extends Row>(
  store: IDBObjectStore,
  p: string,
  after: number,
  limit: number,
): Promise<R[]> {
  const first = blockOf(after + 1);
  const blocks = await request<{ rows: R[] }[]>(
    store.getAll(IDBKeyRange.bound([p, first], [p, Infinity]), Math.ceil(limit / BLOCK) + 1),
  );
  return rowsOfBlocks(blocks)
    .filter((r) => r[0] > after)
    .slice(0, limit);
}

/** How many rows a store of blocks holds (it reads the blocks: a count of rows is not asked for often). */
export async function countRows(store: IDBObjectStore, p: string) {
  const blocks = await request<{ rows: unknown[] }[]>(store.getAll(ofProject(p)));
  return blocks.reduce((n, b) => n + b.rows.length, 0);
}

/** The rows of the layout before the blocks (a record for each row) written in blocks, and taken away. */
export async function oldRowsToBlocks(tx: IDBTransaction, p: string) {
  const [nodes, edges] = await Promise.all([
    request<{ id: number; x: number; y: number; th: number }[]>(
      tx.objectStore(NODES).getAll(ofProject(p)),
    ),
    request<{ id: number; start: number; end: number; radius: number | null; lane: number }[]>(
      tx.objectStore(EDGES).getAll(ofProject(p)),
    ),
  ]);
  await Promise.all([
    changeBlocks(tx.objectStore(NODE_BLOCKS), p, {
      changed: nodes.map((n): Row => [n.id, n.x, n.y, n.th]),
      removed: [],
      ends: false,
    }),
    changeBlocks(tx.objectStore(EDGE_BLOCKS), p, {
      changed: edges.map((e): Row => [e.id, e.start, e.end, e.radius, e.lane]),
      removed: [],
      ends: true,
    }),
  ]);
  tx.objectStore(NODES).delete(ofProject(p));
  tx.objectStore(EDGES).delete(ofProject(p));
}

/** A change of the map applied to the blocks of nodes and segments. */
export async function changeRows(tx: IDBTransaction, p: string, c: MapChange) {
  await Promise.all([
    changeBlocks(tx.objectStore(NODE_BLOCKS), p, {
      changed: c.nodes,
      removed: c.removedNodes,
      ends: false,
    }),
    changeBlocks(tx.objectStore(EDGE_BLOCKS), p, {
      changed: c.edges,
      removed: c.removedEdges,
      ends: true,
    }),
  ]);
}

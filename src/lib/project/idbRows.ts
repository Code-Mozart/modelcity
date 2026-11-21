import type { EdgeRow, NodeRow } from './storage';

export const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

export const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });

export const ofProject = (p: string) => IDBKeyRange.bound([p, -Infinity], [p, Infinity]);

export const node = (p: string, [id, x, y, th]: NodeRow) => ({ p, id, x, y, th });
export const edge = (p: string, [id, start, end, radius, lane]: EdgeRow) => ({
  p,
  id,
  start,
  end,
  radius,
  lane,
});

/** Ids that are this close, or closer, are read with one range (a run). */
const RUN_GAP = 32;
/** A run of fewer ids than this is read with a request for each. */
const RUN_MIN = 8;

/**
 * The rows of a store with these ids (`[project, id]` keys), the ones that are there. A request
 * for a row cost 41 microseconds, a range of rows 6.5 each (^1253), so ids that lie together are
 * read as ranges: a page of segments or nodes in the order of their ids is a few requests, not
 * hundreds.
 */
export async function rowsByIds<R extends { id: number }>(
  store: IDBObjectStore,
  project: string,
  wanted: number[],
): Promise<R[]> {
  const ids = [...new Set(wanted)].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const id of ids) {
    const run = runs[runs.length - 1];
    if (run && id - run[run.length - 1]! <= RUN_GAP) run.push(id);
    else runs.push([id]);
  }
  const reads = runs.flatMap((run) => {
    if (run.length < RUN_MIN)
      return run.map((id) =>
        (request(store.get([project, id])) as Promise<R | undefined>).then((r) => (r ? [r] : [])),
      );
    const [lo, hi] = [run[0]!, run[run.length - 1]!];
    const have = new Set(run);
    return [
      (request(store.getAll(IDBKeyRange.bound([project, lo], [project, hi]))) as Promise<R[]>).then(
        (all) => all.filter((r) => have.has(r.id)),
      ),
    ];
  });
  return (await Promise.all(reads)).flat();
}

/**
 * Delete the rows of a store with these ids (`[project, id]` keys): ids that follow each other are
 * deleted with one request for the run (a road that was drawn in one go has ids in a row), the
 * others one by one. A delete costs about the same whatever it deletes (^1253).
 */
export function deleteIds(store: IDBObjectStore, project: string, ids: number[]) {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  let from = 0;
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === sorted[i - 1]! + 1) continue;
    const [first, last] = [sorted[from]!, sorted[i - 1]!];
    store.delete(
      first === last ? [project, first] : IDBKeyRange.bound([project, first], [project, last]),
    );
    from = i;
  }
}

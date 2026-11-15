import { ProjectFileError } from '../project/file';
import type { EdgeRow, IndexRecord, NodeCell, NodeRow, ProjectStorage } from '../project/storage';
import { curveOf } from './curve';
import { CHUNK_M } from './chunks';

/**
 * The version of what the segment index holds (^1239): a change of how a curve is made, so that
 * the boxes are different, needs a new number, and every index of an older one is built again.
 * `segmentIndex.test.ts` holds the boxes of some curves and fails when they change.
 */
export const INDEX_VERSION = 2;

/** A box of more chunks than this is not listed in each of them: the segment is returned for every chunk (`'wide'`). */
export const MAX_CELLS = 4096;

/** How many rows are made into records, and written, at a time (reads are by range, so a big page costs little more than a small one, ^1253). */
const PAGE = 2000;

const mm = (m: number) => m * 1000;
/** The chunk that a distance in millimeters is in. */
const cellOf = (v: number) => Math.floor(v / 1000 / CHUNK_M);

/**
 * The record of a segment: the box round its curve, in whole millimeters (rounded outwards), and the
 * chunks that box touches, also when it only touches their edge (^1239). The box is the box of the
 * curve and its two nodes (^1242).
 */
export function recordOf(row: EdgeRow, p: NodeRow, q: NodeRow): IndexRecord {
  const { box } = curveOf(row, p, q);
  const [x0, y0] = [Math.floor(mm(box.x0)), Math.floor(mm(box.y0))];
  const [x1, y1] = [Math.ceil(mm(box.x1)), Math.ceil(mm(box.y1))];
  // A box that ends on the line between two chunks touches both.
  const [cx0, cy0, cx1, cy1] = [cellOf(x0 - 1), cellOf(y0 - 1), cellOf(x1), cellOf(y1)];
  const count = (cx1 - cx0 + 1) * (cy1 - cy0 + 1);
  const cells: [number, number][] = [];
  if (count <= MAX_CELLS)
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) cells.push([cx, cy]);
  return { id: row[0], box: [x0, y0, x1, y1], cells: count <= MAX_CELLS ? cells : 'wide' };
}

/** The cell of a node: the chunk its position is in. */
export const cellOfNode = (node: NodeRow): NodeCell => ({
  node,
  cell: [cellOf(node[1]), cellOf(node[2])],
});

export interface BuildOptions {
  signal?: AbortSignal;
  /** How many segments have a record, of how many there are. */
  onProgress?: (done: number, total: number) => void;
  version?: number;
  /** How many rows are made into records, and written, at a time. */
  page?: number;
}

/** Whether the index of a project was built whole for the version: one read of the mark that the build writes when it is done, nothing is counted or looked at (^1239, ^1253: the index is trusted where there is one). */
export async function isComplete(
  storage: ProjectStorage,
  project: string,
  version = INDEX_VERSION,
) {
  return (await storage.indexedVersion(project)) === version;
}

/**
 * Make the records that a project lacks, page by page, and write them (^1239, ^1250): the boxes of
 * the segments, then the cells of the nodes. What is there is kept, so that a build that was
 * stopped goes on where it was. A segment whose node is not there is a damaged project: it fails
 * with the hat of the refusal and what is wrong (^206).
 */
export async function buildIndex(
  storage: ProjectStorage,
  project: string,
  { signal, onProgress, version = INDEX_VERSION, page = PAGE }: BuildOptions = {},
) {
  const status = await storage.indexStatus(project, version);
  const total = status.segments + status.nodes;
  let done = status.indexed + status.nodesIndexed;
  const report = (more: number) => onProgress?.((done += more), total);
  onProgress?.(done, total);
  // Nothing of it there yet: no need to ask, row by row, which rows have a record.
  const run = { storage, project, version, signal, report, cold: done === 0 };
  await paged(
    signal,
    (after) => storage.edgesAfter(project, after, page),
    (page) => segmentPage(run, page),
  );
  await paged(
    signal,
    (after) => storage.nodesAfter(project, after, page),
    (page) => nodePage(run, page),
  );
  await storage.markIndexed(project, version);
}

interface Run {
  storage: ProjectStorage;
  project: string;
  version: number;
  signal?: AbortSignal;
  report: (more: number) => void;
  /** Nothing of the index was there when the build began. */
  cold: boolean;
}

/** The records of the segments of a page that have none. */
async function segmentPage(
  { storage, project, version, signal, report, cold }: Run,
  page: EdgeRow[],
) {
  const have = cold
    ? new Set<number>()
    : await storage.indexedIds(
        project,
        page.map((e) => e[0]),
        version,
      );
  const todo = page.filter((e) => !have.has(e[0]));
  if (todo.length) {
    const ids = new Set(todo.flatMap((e) => [e[1], e[2]]));
    const nodes = new Map((await storage.nodesByIds(project, [...ids])).map((n) => [n[0], n]));
    const records = todo.map((e) =>
      recordOf(e, nodeOrFail(nodes, e, e[1]), nodeOrFail(nodes, e, e[2])),
    );
    signal?.throwIfAborted();
    await storage.putIndex(project, version, records);
  }
  report(todo.length);
}

/** The cells of the nodes of a page that have none. */
async function nodePage({ storage, project, version, report, cold }: Run, page: NodeRow[]) {
  const have = cold
    ? new Set<number>()
    : await storage.indexedNodeIds(
        project,
        page.map((n) => n[0]),
        version,
      );
  const todo = page.filter((n) => !have.has(n[0]));
  if (todo.length) await storage.putNodeCells(project, version, todo.map(cellOfNode));
  report(todo.length);
}

/** Go through the rows in pages, in the order of their ids: `next` gives the page after an id, `each` does a page. */
async function paged<R extends [number, ...unknown[]]>(
  signal: AbortSignal | undefined,
  next: (after: number) => Promise<R[]>,
  each: (page: R[]) => Promise<void>,
) {
  for (let after = -1; ;) {
    signal?.throwIfAborted();
    const page = await next(after);
    if (!page.length) return;
    after = page[page.length - 1]![0];
    await each(page);
  }
}

function nodeOrFail(nodes: Map<number, NodeRow>, edge: EdgeRow, id: number): NodeRow {
  const n = nodes.get(id);
  if (n) return n;
  const detail = `edge ${edge[0]} runs from node ${edge[1]} to node ${edge[2]}, and one of them does not exist`;
  throw new ProjectFileError('damaged', '^206', detail);
}

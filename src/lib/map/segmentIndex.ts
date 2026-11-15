import { ProjectFileError } from '../project/file';
import type { EdgeRow, IndexRecord, NodeRow, ProjectStorage } from '../project/storage';
import { curveOf } from './curve';
import { CHUNK_M } from './chunks';

/**
 * The version of what the segment index holds (^1239): a change of how a curve is made, so that
 * the boxes are different, needs a new number, and every index of an older one is built again.
 * `segmentIndex.test.ts` holds the boxes of some curves and fails when they change.
 */
export const INDEX_VERSION = 1;

/** A box of more chunks than this is not listed in each of them: the segment is returned for every chunk (`'wide'`). */
export const MAX_CELLS = 4096;

/** How many segments are made into records, and written, at a time. */
const PAGE = 500;

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

export interface BuildOptions {
  signal?: AbortSignal;
  /** How many segments have a record, of how many there are. */
  onProgress?: (done: number, total: number) => void;
  version?: number;
}

/** Whether every segment of a project has a record of the version: counted, not looked at (^1239: the index is trusted where there is one). */
export async function isComplete(
  storage: ProjectStorage,
  project: string,
  version = INDEX_VERSION,
) {
  const { segments, indexed } = await storage.indexStatus(project, version);
  return segments === indexed;
}

/**
 * Make the records that a project lacks, page by page, and write them (^1239). What is there is
 * kept, so that a build that was stopped goes on where it was. A segment whose node is not there is
 * a damaged project: it fails with the hat of the refusal and what is wrong (^206).
 */
export async function buildIndex(
  storage: ProjectStorage,
  project: string,
  { signal, onProgress, version = INDEX_VERSION }: BuildOptions = {},
) {
  const { segments, indexed } = await storage.indexStatus(project, version);
  let done = indexed;
  onProgress?.(done, segments);
  for (let after = -1; ;) {
    signal?.throwIfAborted();
    const page = await storage.edgesAfter(project, after, PAGE);
    if (!page.length) return;
    after = page[page.length - 1]![0];
    const have = await storage.indexedIds(
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
      done += todo.length;
    }
    onProgress?.(done, segments);
  }
}

function nodeOrFail(nodes: Map<number, NodeRow>, edge: EdgeRow, id: number): NodeRow {
  const n = nodes.get(id);
  if (n) return n;
  const detail = `edge ${edge[0]} runs from node ${edge[1]} to node ${edge[2]}, and one of them does not exist`;
  throw new ProjectFileError('damaged', '^206', detail);
}

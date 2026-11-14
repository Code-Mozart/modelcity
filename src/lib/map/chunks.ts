import type { Box } from '../curves/hull';

/** The side of a chunk of the map in memory, meters (^1231). Chunks exist only at runtime: nothing that is stored knows them. */
export const CHUNK_M = 256;

/** The chunks of a rectangle: every cell from `cx0` to `cx1` and from `cy0` to `cy1`, both ends included. */
export interface ChunkRange {
  cx0: number;
  cx1: number;
  cy0: number;
  cy1: number;
}

export const chunkId = (cx: number, cy: number) => `${cx},${cy}`;

/** The chunk a point is in. A cell holds its left and top edge, not its right and bottom one. */
export const chunkOf = (x: number, y: number): [number, number] => [
  Math.floor(x / CHUNK_M),
  Math.floor(y / CHUNK_M),
];

/** The chunks that a box touches; the edge of a box that is on a line between two chunks belongs to the one it enters (as a point on it does). */
export function chunksOf(b: Box): ChunkRange {
  const [cx0, cy0] = chunkOf(b.x0, b.y0);
  const [cx1, cy1] = chunkOf(b.x1, b.y1);
  return { cx0, cx1, cy0, cy1 };
}

export const countOf = (r: ChunkRange) => (r.cx1 - r.cx0 + 1) * (r.cy1 - r.cy0 + 1);

/** The ids of the chunks of a range, row by row. */
export function* idsOf(r: ChunkRange): Generator<string> {
  for (let cy = r.cy0; cy <= r.cy1; cy++)
    for (let cx = r.cx0; cx <= r.cx1; cx++) yield chunkId(cx, cy);
}

/** The box that a range of chunks covers, meters. */
export const boxOfRange = (r: ChunkRange): Box => ({
  x0: r.cx0 * CHUNK_M,
  x1: (r.cx1 + 1) * CHUNK_M,
  y0: r.cy0 * CHUNK_M,
  y1: (r.cy1 + 1) * CHUNK_M,
});

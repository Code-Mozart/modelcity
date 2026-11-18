import { screenToWorld, worldToScreen, type Point, type Size, type View } from '../camera/view';
import { distanceToPiece, isDegenerate, nearestParam, pointOn } from '../curves/piece';
import { dist, type Vec } from '../curves/vec';
import type { EdgeRow, NodeRow } from '../project/storage';
import { chunkId, chunkOf, chunksOf, idsWhere, rangeOfIds, type ChunkRange } from './chunks';
import type { Chunk } from './chunkLoader';
import { curveOf } from './curve';
import { overlapsView } from './inView';

/**
 * What can be found on the map under the pointer (^1257): only what is loaded. This is a library
 * on the chunks that are in memory, with no editor and no screen in it; a chunk that is still
 * loading is not interactable, nothing in it or at its place is found.
 */
export interface LoadedMap {
  chunks: ReadonlyMap<string, { status: 'loading' } | { status: 'ready'; chunk: Chunk }>;
  /** A node of the chunks that are loaded, by its id (also the far end of a segment). */
  nodeOf(id: number): NodeRow | undefined;
  /** The loaded segments that start or end at a node (^1258). */
  edgesAt(node: number): EdgeRow[];
}

const toM = (mm: number) => mm / 1000;
const at = (n: NodeRow): Vec => ({ x: toM(n[1]), y: toM(n[2]) });

const readyChunk = (map: LoadedMap, cx: number, cy: number): Chunk | null => {
  const s = map.chunks.get(chunkId(cx, cy));
  return s?.status === 'ready' ? s.chunk : null;
};

function* readyIn(map: LoadedMap, r: ChunkRange): Generator<Chunk> {
  for (let cy = r.cy0; cy <= r.cy1; cy++)
    for (let cx = r.cx0; cx <= r.cx1; cx++) {
      const chunk = readyChunk(map, cx, cy);
      if (chunk) yield chunk;
    }
}

/** The chunks within `reach` meters of a point. */
const around = (pt: Vec, reach: number): ChunkRange =>
  chunksOf({ x0: pt.x - reach, x1: pt.x + reach, y0: pt.y - reach, y1: pt.y + reach });

/**
 * Whether what is within `reach` meters of a point can be picked (^1257): every chunk that the
 * reach touches is loaded. Where one is still loading, a node or segment in it could be the nearest,
 * and the one found in the chunks that are loaded would be the wrong one.
 */
export function interactable(map: LoadedMap, pt: Vec, reach = 0): boolean {
  const r = around(pt, reach);
  for (let cy = r.cy0; cy <= r.cy1; cy++)
    for (let cx = r.cx0; cx <= r.cx1; cx++) if (!readyChunk(map, cx, cy)) return false;
  return true;
}

/** The node nearest to a point, if one is within `reach` meters. */
export function nodeAt(map: LoadedMap, pt: Vec, reach: number): NodeRow | null {
  if (!interactable(map, pt, reach)) return null;
  let best: NodeRow | null = null;
  let bestD = reach;
  for (const chunk of readyIn(map, around(pt, reach)))
    for (const n of chunk.nodes) {
      const d = dist(at(n), pt);
      if (d <= bestD) [best, bestD] = [n, d];
    }
  return best;
}

/** A segment under the pointer: its row, its two nodes, the nearest point of its curve and how far that is. */
export interface SegmentHit {
  edge: EdgeRow;
  nodes: [NodeRow, NodeRow];
  at: Vec;
  d: number;
}

/**
 * The segment whose curve is nearest to a point, if one is within `reach` meters. Both of its
 * nodes are loaded when it is: a chunk holds the far ends of its segments (^1231).
 */
export function segmentAt(map: LoadedMap, pt: Vec, reach: number): SegmentHit | null {
  if (!interactable(map, pt, reach)) return null;
  const seen = new Set<number>();
  let best: SegmentHit | null = null;
  for (const chunk of readyIn(map, around(pt, reach)))
    for (const edge of chunk.edges) {
      if (seen.has(edge[0])) continue;
      seen.add(edge[0]);
      const hit = nearestOnSegment(map, edge, pt, reach);
      if (hit && (!best || hit.d < best.d)) best = hit;
    }
  return best;
}

function nearestOnSegment(
  map: LoadedMap,
  edge: EdgeRow,
  pt: Vec,
  reach: number,
): SegmentHit | null {
  const [p, q] = [map.nodeOf(edge[1]), map.nodeOf(edge[2])];
  if (!p || !q) return null;
  let best: SegmentHit | null = null;
  for (const piece of curveOf(edge, p, q).pieces) {
    if (isDegenerate(piece) || distanceToPiece(piece, pt) > reach) continue;
    const near = pointOn(piece, nearestParam(piece, pt));
    const d = dist(near, pt);
    if (d <= reach && (!best || d < best.d)) best = { edge, nodes: [p, q], at: near, d };
  }
  return best;
}

/** What a box on the screen found: the nodes inside, and how many chunks under it are not loaded (so that the nodes in them are not known). */
export interface BoxFound {
  nodes: number[];
  waiting: number;
}

/**
 * The nodes in a box on the screen (^1257, ^70). The box is a rectangle of the screen, so in the
 * world it is a rectangle that is turned like the view; the chunks that it touches are found with
 * the same test as the chunks of the screen (`overlapsView`).
 */
export function nodesInBox(
  map: LoadedMap,
  { view, size }: { view: View; size: Size },
  a: Point,
  b: Point,
): BoxFound {
  const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
  const [y0, y1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
  const corners = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ].map((c) => screenToWorld(view, size, c));
  const range = rangeOf(corners);
  const middle = screenToWorld(view, size, { x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
  const touches = overlapsView(
    { ...view, cx: middle.x, cy: middle.y },
    { width: x1 - x0, height: y1 - y0 },
  );
  const nodes: number[] = [];
  let waiting = 0;
  for (const id of idsWhere(range, touches)) {
    const state = map.chunks.get(id);
    if (state?.status !== 'ready') {
      waiting++;
      continue;
    }
    for (const n of state.chunk.nodes) {
      const s = worldToScreen(view, size, at(n));
      if (s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1) nodes.push(n[0]);
    }
  }
  return { nodes, waiting };
}

const rangeOf = (points: Vec[]): ChunkRange =>
  rangeOfIds(
    points.map((p) => {
      const [cx, cy] = chunkOf(p.x, p.y);
      return chunkId(cx, cy);
    }),
  );

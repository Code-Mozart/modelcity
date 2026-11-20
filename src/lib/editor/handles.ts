import { ARROW_PX, HIT_PX, handlesOf } from '../curves/handles';
import { add, fromAngle, mul, type Vec } from '../curves/vec';
import { chunksOf, chunkId } from '../map/chunks';
import { curveOf } from '../map/curve';
import type { LoadedMap } from '../map/hit';
import type { EdgeRow, NodeRow } from '../project/storage';

/**
 * A control point of the scaffold (^9, ^60), as a row of the map knows it: the heading point of a
 * node, the bend point of a segment, or a radius point of one of its arcs (`k`, and `t` where on
 * it: 0 start, 1 end, 0.5 middle, ^128).
 */
export type RowHandle = Vec &
  (
    | { type: 'head'; node: number }
    | { type: 'ctrl'; edge: number; nodes: [number, number] }
    | { type: 'rad'; edge: number; nodes: [number, number]; k: number; t: number }
  );

/** How far (pixels) from the pointer the control points are looked for: the farthest a hover or the scaffold reaches (^66). */
export const HANDLE_NEAR_PX = 48;

const m = (mm: number) => mm / 1000;
export const pathNode = (n: NodeRow) => ({ x: m(n[1]), y: m(n[2]), th: n[3] });

/** The heading point of a node: on its heading, `ARROW_PX` from it on the screen (^126). */
export const headPoint = (n: NodeRow, scale: number): Vec =>
  add(pathNode(n), mul(fromAngle(n[3]), ARROW_PX / scale));

/** The bend point and radius points of a segment (`main`'s `handlesOf` for a path of its two nodes). */
export function edgeHandles(row: EdgeRow, p: NodeRow, q: NodeRow, scale: number): RowHandle[] {
  const E = curveOf(row, p, q).E;
  const [a, b] = [pathNode(p), pathNode(q)];
  const path = { nodes: [a, b], radii: [row[3] === null ? null : m(row[3])] };
  const of = { edge: row[0], nodes: [row[1], row[2]] as [number, number] };
  return handlesOf(path, [{ i: 0, p: a, q: b, E }], scale).flatMap((h): RowHandle[] => {
    if (h.type === 'ctrl') return [{ type: 'ctrl', ...of, x: h.x, y: h.y }];
    if (h.type === 'rad') return [{ type: 'rad', ...of, k: h.k!, t: h.t!, x: h.x, y: h.y }];
    return [];
  });
}

/** The rows of the loaded chunks within `reach` meters of a point, each once. */
function rowsNear(map: LoadedMap, pt: Vec, reach: number) {
  const r = chunksOf({ x0: pt.x - reach, x1: pt.x + reach, y0: pt.y - reach, y1: pt.y + reach });
  const nodes = new Map<number, NodeRow>();
  const edges = new Map<number, EdgeRow>();
  for (let cy = r.cy0; cy <= r.cy1; cy++)
    for (let cx = r.cx0; cx <= r.cx1; cx++) {
      const s = map.chunks.get(chunkId(cx, cy));
      if (s?.status !== 'ready') continue;
      s.chunk.nodes.forEach((n) => nodes.set(n[0], n));
      s.chunk.edges.forEach((e) => edges.set(e[0], e));
    }
  return { nodes, edges };
}

/** The control points within `HANDLE_NEAR_PX` of a point, of the loaded nodes and segments. */
export function handlesNear(map: LoadedMap, pt: Vec, scale: number): RowHandle[] {
  const near = HANDLE_NEAR_PX / scale;
  const { nodes, edges } = rowsNear(map, pt, near + ARROW_PX / scale);
  const close = (h: Vec) => Math.hypot(h.x - pt.x, h.y - pt.y) <= near;
  const heads = [...nodes.values()].map((n): RowHandle => ({
    type: 'head',
    node: n[0],
    ...headPoint(n, scale),
  }));
  const curves = [...edges.values()].flatMap((e) => {
    const [p, q] = [map.nodeOf(e[1]), map.nodeOf(e[2])];
    return p && q ? edgeHandles(e, p, q, scale) : [];
  });
  return [...heads, ...curves].filter(close);
}

/** Of control points equally near, the earlier type wins (`main`'s `hitHandle`). */
const PRIORITY: RowHandle['type'][] = ['head', 'ctrl', 'rad'];

/** The control point under the pointer: the nearest within `HIT_PX` (`main`'s `hitHandle`; the nodes are picked before, ^137). */
export function handleAt(map: LoadedMap, pt: Vec, scale: number, touch: boolean): RowHandle | null {
  let best: RowHandle | null = null;
  let bd = HIT_PX[touch ? 'touch' : 'mouse'] / scale;
  const all = handlesNear(map, pt, scale);
  for (const h of PRIORITY.flatMap((t) => all.filter((x) => x.type === t))) {
    const d = Math.hypot(h.x - pt.x, h.y - pt.y);
    if (d < bd - 1e-9) [best, bd] = [h, d];
  }
  return best;
}

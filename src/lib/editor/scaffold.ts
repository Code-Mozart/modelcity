import { distanceToPiece, isDegenerate } from '../curves/piece';
import { dist, type Vec } from '../curves/vec';
import { chunkId, chunksOf } from '../map/chunks';
import type { LoadedMap } from '../map/hit';
import type { EdgeRow } from '../project/storage';
import { curveOf } from '../map/curve';
import { edgeHandles, HANDLE_NEAR_PX, headPoint } from './handles';
import type { Grip } from './moving';

/** Within this many pixels of its curve the segment the pointer is on shows its scaffold (`main`'s `CURVE_NEAR_PX`). */
export const CURVE_NEAR_PX = 20;

/** What decides which segments show their scaffold: the pointer, what it holds or is on, and the selected segments in view. */
export interface ScaffoldInput {
  map: LoadedMap;
  pt: Vec | null;
  scale: number;
  /** The control point or node that is hovered or dragged. */
  focus: Grip | null;
  /** The segments in view whose two nodes are selected (^133). */
  selected: readonly number[];
}

/** The loaded segments within `reach` meters of a point, each once. */
function segmentsNear(map: LoadedMap, pt: Vec, reach: number): EdgeRow[] {
  const r = chunksOf({ x0: pt.x - reach, x1: pt.x + reach, y0: pt.y - reach, y1: pt.y + reach });
  const out = new Map<number, EdgeRow>();
  for (let cy = r.cy0; cy <= r.cy1; cy++)
    for (let cx = r.cx0; cx <= r.cx1; cx++) {
      const s = map.chunks.get(chunkId(cx, cy));
      if (s?.status === 'ready') s.chunk.edges.forEach((e) => out.set(e[0], e));
    }
  return [...out.values()];
}

/** How far (pixels) a segment's curve and its nearest control point are from the pointer. */
function scoresOf(map: LoadedMap, e: EdgeRow, pt: Vec, scale: number) {
  const [p, q] = [map.nodeOf(e[1]), map.nodeOf(e[2])];
  if (!p || !q) return null;
  const pieces = curveOf(e, p, q).pieces.filter((x) => !isDegenerate(x));
  const curve = Math.min(...pieces.map((x) => distanceToPiece(x, pt)));
  const points = [headPoint(p, scale), headPoint(q, scale), ...edgeHandles(e, p, q, scale)];
  return {
    id: e[0],
    curve: curve * scale,
    points: Math.min(...points.map((h) => dist(h, pt))) * scale,
  };
}

type Scores = NonNullable<ReturnType<typeof scoresOf>>;
const closest = (list: Scores[], by: (s: Scores) => number) =>
  list.reduce<Scores | undefined>((best, s) => (!best || by(s) < by(best) ? s : best), undefined);

/**
 * The segment whose scaffold is shown (`main`'s `activeSegment`, ^60, ^66): the one of the control
 * point or node that is hovered or dragged (of a node, the segment whose curve is nearest the
 * pointer); else the segment the pointer is on (within `CURVE_NEAR_PX` of its curve), the nearest
 * curve first; else the one with the nearest control point within `HANDLE_NEAR_PX`.
 */
export function activeSegment(input: ScaffoldInput): number | null {
  const { focus, pt } = input;
  if (focus && (focus.type === 'ctrl' || focus.type === 'rad')) return focus.edge;
  if (!pt) return null;
  return focus ? ofNode(input, focus.node, pt) : nearest(input, pt);
}

/** Of the segments at a hovered or dragged node or heading point, the one whose curve is nearest the pointer. */
function ofNode({ map, scale }: ScaffoldInput, node: number, pt: Vec) {
  const scores = map.edgesAt(node).flatMap((e) => scoresOf(map, e, pt, scale) ?? []);
  return closest(scores, (s) => s.curve)?.id ?? null;
}

/** The segment the pointer is on, else the one with the nearest control point. */
function nearest({ map, scale }: ScaffoldInput, pt: Vec) {
  const near = segmentsNear(map, pt, HANDLE_NEAR_PX / scale);
  const scores = near.flatMap((e) => scoresOf(map, e, pt, scale) ?? []);
  const on = closest(
    scores.filter((s) => s.curve <= CURVE_NEAR_PX),
    (s) => s.curve,
  );
  if (on) return on.id;
  const close = scores.filter((s) => s.points <= HANDLE_NEAR_PX);
  return closest(close, (s) => s.points + s.curve * 1e-6)?.id ?? null;
}

/** The segments that show their scaffold: the active one, and with it all selected segments when it is one of several (^133). */
export function shownSegments(input: ScaffoldInput): number[] {
  const active = activeSegment(input);
  if (active === null) return [];
  return input.selected.length > 1 && input.selected.includes(active)
    ? [...input.selected]
    : [active];
}

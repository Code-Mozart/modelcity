import type { Point } from '../camera/view';
import { worldToScreen } from '../camera/view';
import type { SkeletonEdge } from '../map/curve';
import type { NodeRow } from '../project/storage';
import type { Frame, Palette } from './paint';
import { trace } from './skeleton';

/**
 * What is marked on the map (^1257): the selected nodes and segments, what a click would pick
 * (hover), and the box that is being dragged. No colour of its own (^805): the blue of the controls.
 */
export interface Marks {
  selected: readonly NodeRow[];
  selectedEdges: readonly SkeletonEdge[];
  hoverNodes: readonly NodeRow[];
  hoverEdge: SkeletonEdge | null;
  band: { a: Point; b: Point } | null;
}

export const NO_MARKS: Marks = {
  selected: [],
  selectedEdges: [],
  hoverNodes: [],
  hoverEdge: null,
  band: null,
};

const SELECTED_RING_PX = 9;
const RING_LINE_PX = 3;
const SELECTED_CURVE_PX = 5;
const HOVER_CURVE_PX = 7;
const HOVER_ALPHA = 0.4;
const BAND_ALPHA = 0.12;

function rings(f: Frame, nodes: readonly NodeRow[]) {
  const { ctx, view, size } = f;
  ctx.beginPath();
  for (const n of nodes) {
    const s = worldToScreen(view, size, { x: n[1] / 1000, y: n[2] / 1000 });
    ctx.moveTo(s.x + SELECTED_RING_PX, s.y);
    ctx.arc(s.x, s.y, SELECTED_RING_PX, 0, 2 * Math.PI);
  }
  ctx.stroke();
}

function curves(f: Frame, edges: readonly SkeletonEdge[], width: number) {
  const { ctx } = f;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  edges.forEach((e) => trace(f, e.pieces));
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawBand({ ctx }: Frame, { a, b }: NonNullable<Marks['band']>, pal: Palette) {
  const [x, y, w, h] = [
    Math.min(a.x, b.x),
    Math.min(a.y, b.y),
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
  ];
  ctx.fillStyle = pal.blue;
  ctx.globalAlpha = BAND_ALPHA;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.blue;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

/** The marks, over the map: hover under the selection, the box last. */
export function drawMarks(f: Frame, marks: Marks, pal: Palette) {
  const { ctx } = f;
  ctx.strokeStyle = pal.blue;
  ctx.globalAlpha = HOVER_ALPHA;
  if (marks.hoverEdge) curves(f, [marks.hoverEdge], HOVER_CURVE_PX);
  ctx.lineWidth = RING_LINE_PX;
  rings(f, marks.hoverNodes);
  ctx.globalAlpha = 1;
  curves(f, marks.selectedEdges, SELECTED_CURVE_PX);
  ctx.lineWidth = RING_LINE_PX;
  rings(f, marks.selected);
  if (marks.band) drawBand(f, marks.band, pal);
}

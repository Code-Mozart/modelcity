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
  /** The segment a click would pick, or with Alt all the segments of its branch (^99, ^128). */
  hoverEdges: readonly SkeletonEdge[];
  band: { a: Point; b: Point } | null;
}

export const NO_MARKS: Marks = {
  selected: [],
  selectedEdges: [],
  hoverNodes: [],
  hoverEdges: [],
  band: null,
};

/** The halo round a node that is selected or hovered: a disc under its dot, so that a ring of it shows (a fill is much cheaper to draw than a stroked ring, ^1257). */
const HALO_PX = 9;
const SELECTED_CURVE_PX = 5;
const HOVER_CURVE_PX = 7;
const HOVER_ALPHA = 0.4;
const BAND_ALPHA = 0.12;

function halos(f: Frame, nodes: readonly NodeRow[]) {
  const { ctx, view, size } = f;
  ctx.beginPath();
  for (const n of nodes) {
    const s = worldToScreen(view, size, { x: n[1] / 1000, y: n[2] / 1000 });
    ctx.moveTo(s.x + HALO_PX, s.y);
    ctx.arc(s.x, s.y, HALO_PX, 0, 2 * Math.PI);
  }
  ctx.fill();
}

function curves(f: Frame, edges: readonly SkeletonEdge[], width: number) {
  const { ctx } = f;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  edges.forEach((e) => trace(f, e.pieces));
  ctx.stroke();
}

/** Under the curves: what a click would pick (a thick curve), and the selected segments. */
export function drawMarksUnder(f: Frame, marks: Marks, pal: Palette) {
  const { ctx } = f;
  ctx.strokeStyle = pal.blue;
  ctx.globalAlpha = HOVER_ALPHA;
  curves(f, marks.hoverEdges, HOVER_CURVE_PX);
  ctx.globalAlpha = 1;
  curves(f, marks.selectedEdges, SELECTED_CURVE_PX);
}

/** Over the curves and under the dots of the nodes: the halos of the selected nodes and of the hovered ones. */
export function drawMarksHalos(f: Frame, marks: Marks, pal: Palette) {
  const { ctx } = f;
  ctx.fillStyle = pal.blue;
  ctx.globalAlpha = HOVER_ALPHA;
  halos(f, marks.hoverNodes);
  ctx.globalAlpha = 1;
  halos(f, marks.selected);
}

/** Over everything: the box that is being dragged. */
export function drawBand({ ctx }: Frame, marks: Marks, pal: Palette) {
  if (!marks.band) return;
  const { a, b } = marks.band;
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

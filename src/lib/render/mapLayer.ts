import type { Box } from '../curves/hull';
import type { NodeRow } from '../project/storage';
import { worldToScreen } from '../camera/view';
import { text, type Frame, type Palette } from './paint';
import type { SkeletonEdge } from '../map/curve';
import { drawCurves } from './skeleton';
import { drawMarks, NO_MARKS, type Marks } from './marks';

/** One chunk of the map as it is drawn: where it is, and its nodes, or null while it is not loaded (^1238). */
export interface ChunkView {
  box: Box;
  nodes: readonly NodeRow[] | null;
  /** How far the chunk is on its way, 0 to 1 (real: rows read of rows there are), while `nodes` is null. */
  progress: number;
}

export interface MapScene {
  chunks: ChunkView[];
  /** The segments of the loaded chunks that are in view, each once (^1247). */
  edges: readonly SkeletonEdge[];
  /** What is selected, hovered and dragged as a box (^1257). */
  marks?: Marks;
  /** So much of the map is in view that nothing of it is loaded (no level of detail yet). */
  tooMuch: boolean;
}

const NODE_RADIUS_PX = 5.5;
const RING_RADIUS_PX = 10;
/** A chunk smaller than this on the screen gets no ring. */
const RING_MIN_PX = 40;
const HATCH_PX = 12;
const HATCH_ALPHA = 0.3;
const BORDER_ALPHA = 0.5;
/** A ring that is just starting shows this much of itself, so that it is seen. */
const MIN_ARC = 0.02;
/** The ring stays this far from the edge of the screen. */
const RING_INSET_PX = 60;

const patterns = new Map<string, CanvasPattern>();

/** Diagonal lines for a chunk that is not loaded: no colour of its own (^805), the muted one, faint. */
function hatch(ctx: CanvasRenderingContext2D, color: string): CanvasPattern {
  let pattern = patterns.get(color);
  if (!pattern) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = HATCH_PX;
    const t = tile.getContext('2d')!;
    t.strokeStyle = color;
    t.globalAlpha = HATCH_ALPHA;
    t.lineWidth = 1.5;
    t.beginPath();
    t.moveTo(0, HATCH_PX);
    t.lineTo(HATCH_PX, 0);
    t.moveTo(-1, 1);
    t.lineTo(1, -1);
    t.moveTo(HATCH_PX - 1, HATCH_PX + 1);
    t.lineTo(HATCH_PX + 1, HATCH_PX - 1);
    t.stroke();
    pattern = ctx.createPattern(tile, 'repeat')!;
    patterns.set(color, pattern);
  }
  return pattern;
}

function corners(f: Frame, b: Box) {
  return [
    { x: b.x0, y: b.y0 },
    { x: b.x1, y: b.y0 },
    { x: b.x1, y: b.y1 },
    { x: b.x0, y: b.y1 },
  ].map((p) => worldToScreen(f.view, f.size, p));
}

/** The ring in the middle of a chunk that is being read: a faint circle and the part of it that is done. */
function drawRing(f: Frame, at: { x: number; y: number }, progress: number, pal: Palette) {
  const { ctx } = f;
  const start = -Math.PI / 2;
  ctx.strokeStyle = pal.muted;
  ctx.lineWidth = 2;
  ctx.globalAlpha = BORDER_ALPHA;
  ctx.beginPath();
  ctx.arc(at.x, at.y, RING_RADIUS_PX, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(at.x, at.y, RING_RADIUS_PX, start, start + 2 * Math.PI * Math.max(progress, MIN_ARC));
  ctx.stroke();
}

/** A chunk that is not loaded: hatched, with a border, and a ring in the middle that fills as it is read. */
function drawLoading(f: Frame, b: Box, progress: number, pal: Palette) {
  const { ctx } = f;
  const quad = corners(f, b);
  ctx.beginPath();
  quad.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = hatch(ctx, pal.muted);
  ctx.fill();
  ctx.strokeStyle = pal.muted;
  ctx.globalAlpha = BORDER_ALPHA;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const [a, c] = [quad[0]!, quad[2]!];
  if (Math.hypot(c.x - a.x, c.y - a.y) < RING_MIN_PX * Math.SQRT2) return;
  // In the middle of the part of the chunk that is on the screen, so that the rings of the chunks at the edge do not pile up.
  const mid = (lo: number, hi: number, side: number) => {
    const [from, to] = [Math.max(lo, 0), Math.min(hi, side)];
    const v = from < to ? (from + to) / 2 : (lo + hi) / 2;
    return Math.min(Math.max(v, RING_INSET_PX), side - RING_INSET_PX);
  };
  const xs = quad.map((q) => q.x);
  const ys = quad.map((q) => q.y);
  drawRing(
    f,
    {
      x: mid(Math.min(...xs), Math.max(...xs), f.size.width),
      y: mid(Math.min(...ys), Math.max(...ys), f.size.height),
    },
    progress,
    pal,
  );
}

/** The node dots: one path, one fill and one stroke for all, and the projection worked out once (^1249: it was a call and two objects for each node, and a read through a proxy of the view for each number). */
function drawNodes(f: Frame, chunks: readonly (readonly NodeRow[])[], pal: Palette) {
  const { ctx, view, size } = f;
  const [cos, sin] = [Math.cos(view.rot), Math.sin(view.rot)];
  const [ox, oy] = [size.width / 2, size.height / 2];
  const [reach_x, reach_y] = [size.width + NODE_RADIUS_PX, size.height + NODE_RADIUS_PX];
  ctx.fillStyle = pal.ink;
  ctx.strokeStyle = pal.bg;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const nodes of chunks) {
    for (const n of nodes) {
      const [dx, dy] = [n[1] / 1000 - view.cx, n[2] / 1000 - view.cy];
      const sx = (dx * cos - dy * sin) * view.scale + ox;
      const sy = (dx * sin + dy * cos) * view.scale + oy;
      if (sx < -NODE_RADIUS_PX || sy < -NODE_RADIUS_PX || sx > reach_x || sy > reach_y) continue;
      ctx.moveTo(sx + NODE_RADIUS_PX, sy);
      ctx.arc(sx, sy, NODE_RADIUS_PX, 0, 2 * Math.PI);
    }
  }
  ctx.fill();
  ctx.stroke();
}

/** The map: the chunks that are not loaded, the curves of the segments, and the nodes of the chunks that are loaded. */
export function drawMap(f: Frame, scene: MapScene, pal: Palette) {
  for (const c of scene.chunks) if (!c.nodes) drawLoading(f, c.box, c.progress, pal);
  drawCurves(f, scene.edges, pal);
  drawNodes(
    f,
    scene.chunks.flatMap((c) => (c.nodes ? [c.nodes] : [])),
    pal,
  );
  drawMarks(f, scene.marks ?? NO_MARKS, pal);
  if (scene.tooMuch)
    text(
      f.ctx,
      'zoom in to see the map',
      { x: f.size.width / 2, y: f.size.height / 2 },
      { color: pal.muted, align: 'center' },
    );
}

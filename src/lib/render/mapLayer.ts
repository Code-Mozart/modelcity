import type { Box } from '../curves/hull';
import type { NodeRow } from '../project/storage';
import { worldToScreen } from '../camera/view';
import { text, type Frame, type Palette } from './paint';
import { drawCurves, type SkeletonEdge } from './skeleton';

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
  // In the middle of the chunk, but where it can be seen if the middle is off the screen.
  const inside = (v: number, side: number) =>
    Math.min(Math.max(v, RING_INSET_PX), side - RING_INSET_PX);
  drawRing(
    f,
    { x: inside((a.x + c.x) / 2, f.size.width), y: inside((a.y + c.y) / 2, f.size.height) },
    progress,
    pal,
  );
}

function drawNodes(f: Frame, nodes: readonly NodeRow[], pal: Palette) {
  const { ctx, view, size } = f;
  ctx.fillStyle = pal.ink;
  ctx.strokeStyle = pal.bg;
  ctx.lineWidth = 1.5;
  for (const [, x, y] of nodes) {
    const p = worldToScreen(view, size, { x: x / 1000, y: y / 1000 });
    if (p.x < -10 || p.y < -10 || p.x > size.width + 10 || p.y > size.height + 10) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, NODE_RADIUS_PX, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
}

/** The map: the chunks that are not loaded, the curves of the segments, and the nodes of the chunks that are loaded. */
export function drawMap(f: Frame, scene: MapScene, pal: Palette) {
  for (const c of scene.chunks) if (!c.nodes) drawLoading(f, c.box, c.progress, pal);
  drawCurves(f, scene.edges, pal);
  for (const c of scene.chunks) if (c.nodes) drawNodes(f, c.nodes, pal);
  if (scene.tooMuch)
    text(
      f.ctx,
      'zoom in to see the map',
      { x: f.size.width / 2, y: f.size.height / 2 },
      { color: pal.muted, align: 'center' },
    );
}

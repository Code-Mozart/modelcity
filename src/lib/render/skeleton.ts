import { samplesAlong } from '../curves/arrows';
import { buildEdge } from '../curves/edge';
import { boxAround, type Box } from '../curves/hull';
import type { Piece } from '../curves/types';
import type { EdgeRow, NodeRow } from '../project/storage';
import { screenToWorld, worldToScreen } from '../camera/view';
import { viewBox, type Frame, type Palette } from './paint';

/** The skeleton of the map (^60, ^1240): the curves of the segments, with chevrons that point the way they run (^80), and the node dots. */

/** A segment as it is drawn: its curve and the box round it (the same box that the cache of the segments will hold, ^1239). */
export interface SkeletonEdge {
  id: number;
  pieces: Piece[];
  box: Box;
}

const CURVE_PX = 2;
const CHEVRON = { size: 6, spread: 0.7 };
/** Distance between the chevrons along a curve, in pixels (^80). */
const SPACING_PX = 72;
/** A curve this far outside the screen is not drawn (its stroke and chevrons reach in), in pixels. */
const MARGIN_PX = 12;

const toM = (mm: number) => mm / 1000;
const node = ([, x, y, th]: NodeRow) => ({ x: toM(x), y: toM(y), th });

const curves = new WeakMap<EdgeRow, { p: NodeRow; q: NodeRow; edge: SkeletonEdge }>();

/**
 * The curve of a segment, made from its two nodes and its radius alone (^172) and kept while the
 * rows stay the same objects (the rows are shared between the chunks, `ChunkIndex`).
 */
export function curveOf(row: EdgeRow, p: NodeRow, q: NodeRow): SkeletonEdge {
  const kept = curves.get(row);
  if (kept && kept.p === p && kept.q === q) return kept.edge;
  const pieces = buildEdge(node(p), node(q), row[3] === null ? null : toM(row[3])).pieces;
  const edge = { id: row[0], pieces, box: boxAround(pieces) };
  curves.set(row, { p, q, edge });
  return edge;
}

/** Trace pieces that follow each other into the current path of the canvas. */
function trace(f: Frame, pieces: Piece[]) {
  const first = pieces[0];
  if (!first) return;
  const a = worldToScreen(f.view, f.size, first.P);
  f.ctx.moveTo(a.x, a.y);
  for (const piece of pieces) {
    if (piece.type === 'line') {
      const b = worldToScreen(f.view, f.size, piece.Q);
      f.ctx.lineTo(b.x, b.y);
    } else {
      const c = worldToScreen(f.view, f.size, piece.c);
      const a0 = piece.a0 + f.view.rot;
      f.ctx.arc(c.x, c.y, piece.r * f.view.scale, a0, a0 + piece.da, piece.da < 0);
    }
  }
}

const meets = (a: Box, b: Box) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;

/** Chevrons along the curves at a constant pixel distance, pointing the way the road runs. All in one path. */
function chevrons(f: Frame, edges: SkeletonEdge[]) {
  const { ctx, view, size } = f;
  // At the greatest zoom a road is a million pixels long: only what can be on the screen (^864).
  const within = {
    c: screenToWorld(view, size, { x: size.width / 2, y: size.height / 2 }),
    r: (Math.hypot(size.width, size.height) / 2 + SPACING_PX) / view.scale,
  };
  ctx.beginPath();
  for (const edge of edges) {
    for (const s of samplesAlong(edge.pieces, SPACING_PX / view.scale, undefined, within)) {
      const at = worldToScreen(view, size, s);
      const t = worldToScreen(view, size, { x: s.x + s.tx, y: s.y + s.ty });
      const dir = Math.atan2(t.y - at.y, t.x - at.x);
      for (const side of [-1, 1]) {
        const a = dir + Math.PI + side * CHEVRON.spread;
        ctx.moveTo(at.x, at.y);
        ctx.lineTo(at.x + CHEVRON.size * Math.cos(a), at.y + CHEVRON.size * Math.sin(a));
      }
    }
  }
  ctx.stroke();
}

/** The curves and their chevrons: what is on the screen only, each kind in one stroke. */
export function drawCurves(f: Frame, edges: readonly SkeletonEdge[], pal: Palette) {
  const { ctx, view } = f;
  const seen = viewBox(f, MARGIN_PX / view.scale);
  const shown = edges.filter((e) => meets(e.box, seen));
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = CURVE_PX;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  shown.forEach((e) => trace(f, e.pieces));
  ctx.stroke();
  ctx.lineCap = 'butt';
  chevrons(f, shown);
}

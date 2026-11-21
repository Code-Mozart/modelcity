import { worldToScreen, type Point } from '../camera/view';
import type { Piece } from '../curves/types';
import type { Ghost } from '../editor/drawGhost';
import type { Frame, Palette } from './paint';
import { trace } from './skeleton';

const DASH = [6, 6];
const GHOST_ALPHA = 0.6;
const GHOST_DOT_PX = 5;
const ARROW_PX = 18;
const HEAD_PX = 5;

/** The preview of draw mode (^40, ^125): the curve dashed like the curve it would be, and the node it would place, faint, with an arrow for its heading. */
export function drawGhost(f: Frame, ghost: Ghost | null, pal: Palette) {
  if (ghost?.pieces) dashed(f, ghost.pieces, pal);
  if (!ghost?.node) return;
  f.ctx.globalAlpha = GHOST_ALPHA;
  const s = worldToScreen(f.view, f.size, ghost.node);
  arrow(f.ctx, s, ghost.node.th + f.view.rot, pal.orange);
  f.ctx.fillStyle = pal.ink;
  f.ctx.beginPath();
  f.ctx.arc(s.x, s.y, GHOST_DOT_PX, 0, 2 * Math.PI);
  f.ctx.fill();
  f.ctx.globalAlpha = 1;
}

function dashed(f: Frame, pieces: Piece[], pal: Palette) {
  const { ctx } = f;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(DASH);
  ctx.beginPath();
  trace(f, pieces);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** An arrow from a point of the screen the way of an angle (the heading of a node). */
function arrow(ctx: CanvasRenderingContext2D, s: Point, a: number, color: string) {
  const tip = { x: s.x + Math.cos(a) * ARROW_PX, y: s.y + Math.sin(a) * ARROW_PX };
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(tip.x, tip.y);
  for (const side of [-1, 1]) {
    const b = a + Math.PI + (side * Math.PI) / 6;
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x + Math.cos(b) * HEAD_PX, tip.y + Math.sin(b) * HEAD_PX);
  }
  ctx.stroke();
}

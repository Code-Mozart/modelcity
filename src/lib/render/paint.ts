import { rotateVec, worldToScreen, type Point, type Size, type View } from '../camera/view';
import type { Piece } from '../curves/types';

/** Canvas 2D primitives in screen pixels, plus the world-to-screen mapping of a frame. */
export interface Frame {
  ctx: CanvasRenderingContext2D;
  view: View;
  size: Size;
}

export interface Stroke {
  color: string;
  width: number;
  dash?: number[];
}

const PALETTE_KEYS = [
  'bg',
  'grid-minor',
  'grid-major',
  'ink',
  'muted',
  'road',
  'road-edge',
  'blue',
  'red',
  'orange',
  'turquoise',
  'red-ink',
  'orange-ink',
] as const;
export type Palette = Record<(typeof PALETTE_KEYS)[number], string>;

/** Colors come from CSS variables so light and dark mode work (see app.css). */
export function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const entries = PALETTE_KEYS.map((k) => [k, style.getPropertyValue(`--${k}`).trim()]);
  return Object.fromEntries(entries) as Palette;
}

/** A world-space direction as a screen-space direction (the view may be rotated). */
export const screenDir = ({ view }: Frame, v: Point): Point => rotateVec(v, view.rot);

export const toScreen = ({ view, size }: Frame, p: Point): Point => worldToScreen(view, size, p);

export function segment(ctx: CanvasRenderingContext2D, a: Point, b: Point, s: Stroke) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  applyStroke(ctx, s);
}

export function applyStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.setLineDash(s.dash ?? []);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** The segment a-b extended by `before` and `after` pixels at its ends (screen points in). */
export function extend(a: Point, b: Point, before: number, after: number): [Point, Point] {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / l;
  const uy = (b.y - a.y) / l;
  return [
    { x: a.x - ux * before, y: a.y - uy * before },
    { x: b.x + ux * after, y: b.y + uy * after },
  ];
}

export function dot(ctx: CanvasRenderingContext2D, p: Point, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function ring(ctx: CanvasRenderingContext2D, p: Point, r: number, s: Stroke) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  applyStroke(ctx, s);
}

/** The one font size of all text, in px; the same as `--font-size` in app.css (^83). */
export const FONT_PX = 12;

export interface TextStyle {
  color: string;
  align?: CanvasTextAlign;
}

export function text(ctx: CanvasRenderingContext2D, s: string, p: Point, t: TextStyle) {
  ctx.font = `${FONT_PX}px system-ui, sans-serif`;
  ctx.fillStyle = t.color;
  ctx.textAlign = t.align ?? 'left';
  ctx.fillText(s, p.x, p.y);
}

/** Add a piece to the current canvas path (screen space); an arc is joined to the point before it. */
function tracePiece(f: Frame, piece: Piece) {
  const { ctx } = f;
  if (piece.type === 'line') {
    const a = toScreen(f, piece.P);
    const b = toScreen(f, piece.Q);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  } else {
    const c = toScreen(f, piece.c);
    const a0 = piece.a0 + f.view.rot;
    ctx.arc(c.x, c.y, piece.r * f.view.scale, a0, a0 + piece.da, piece.da < 0);
  }
}

/** Stroke one piece. */
export const strokePiece = (f: Frame, piece: Piece, s: Stroke) => strokeChain(f, [piece], s);

/** Stroke pieces that follow each other as one path: round ends and joins (^21, ^91). */
export function strokeChain(f: Frame, pieces: Piece[], s: Stroke) {
  f.ctx.beginPath();
  for (const piece of pieces) tracePiece(f, piece);
  f.ctx.lineCap = 'round';
  f.ctx.lineJoin = 'round';
  applyStroke(f.ctx, s);
}

/** The two barbs of an arrow head at `tip`: lines of `size` px going back from the direction `dir` (screen angle), `spread` radians to each side. */
export function barbs(ctx: CanvasRenderingContext2D, tip: Point, dir: number, head: HeadStyle) {
  for (const side of [-1, 1]) {
    const a = dir + Math.PI + side * head.spread;
    const end = { x: tip.x + head.size * Math.cos(a), y: tip.y + head.size * Math.sin(a) };
    segment(ctx, tip, end, { color: head.color, width: head.width });
  }
}

export interface HeadStyle {
  size: number;
  spread: number;
  color: string;
  width: number;
}

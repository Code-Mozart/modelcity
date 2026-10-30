import { worldToScreen, type Point, type Size, type View } from './view';
import type { Piece } from './curves/types';

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

export const PALETTE_KEYS = [
  'bg',
  'grid-minor',
  'grid-major',
  'ink',
  'muted',
  'curve',
  'blue',
  'teal',
  'red',
  'orange',
] as const;
export type Palette = Record<(typeof PALETTE_KEYS)[number], string>;

/** Colors come from CSS variables so light and dark mode work (see app.css). */
export function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const entries = PALETTE_KEYS.map((k) => [k, style.getPropertyValue(`--${k}`).trim()]);
  return Object.fromEntries(entries) as Palette;
}

export const toScreen = ({ view, size }: Frame, p: Point): Point => worldToScreen(view, size, p);

export function segment(ctx: CanvasRenderingContext2D, a: Point, b: Point, s: Stroke) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  applyStroke(ctx, s);
}

function applyStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
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

export interface TextStyle {
  color: string;
  size?: number;
  align?: CanvasTextAlign;
}

export function text(ctx: CanvasRenderingContext2D, s: string, p: Point, t: TextStyle) {
  ctx.font = `italic ${t.size ?? 13}px system-ui, sans-serif`;
  ctx.fillStyle = t.color;
  ctx.textAlign = t.align ?? 'left';
  ctx.fillText(s, p.x, p.y);
}

/** Stroke a line or arc piece; pieces that draw nothing are skipped. */
export function strokePiece(f: Frame, piece: Piece, s: Stroke) {
  const { ctx } = f;
  ctx.beginPath();
  if (piece.type === 'line') {
    const a = toScreen(f, piece.P);
    const b = toScreen(f, piece.Q);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  } else {
    const c = toScreen(f, piece.c);
    ctx.arc(c.x, c.y, piece.r * f.view.scale, piece.a0, piece.a0 + piece.da, piece.da < 0);
  }
  ctx.lineCap = 'round';
  applyStroke(ctx, s);
}

import { rotateVec, worldToScreen, type Point } from '../camera/view';
import type { Frame } from './paint';

/** Canvas primitives in screen pixels for the scaffold (^9, ^60), ported from `main`'s `render/paint.ts`. */
export interface Stroke {
  color: string;
  width: number;
  dash?: number[];
}

/** A world-space direction as a screen-space direction (the view may be rotated). */
export const screenDir = ({ view }: Frame, v: Point): Point => rotateVec(v, view.rot);

export const toScreen = ({ view, size }: Frame, p: Point): Point => worldToScreen(view, size, p);

export function applyStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.setLineDash(s.dash ?? []);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function segment(ctx: CanvasRenderingContext2D, a: Point, b: Point, s: Stroke) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  applyStroke(ctx, s);
}

/** The segment a-b extended by `before` and `after` pixels at its ends (screen points in). */
export function extend(a: Point, b: Point, before: number, after: number): [Point, Point] {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const [ux, uy] = [(b.x - a.x) / l, (b.y - a.y) / l];
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

export interface HeadStyle {
  size: number;
  spread: number;
  color: string;
  width: number;
}

/** The two barbs of an arrow head at `tip`, going back from the screen angle `dir`. */
export function barbs(ctx: CanvasRenderingContext2D, tip: Point, dir: number, head: HeadStyle) {
  for (const side of [-1, 1]) {
    const a = dir + Math.PI + side * head.spread;
    const end = { x: tip.x + head.size * Math.cos(a), y: tip.y + head.size * Math.sin(a) };
    segment(ctx, tip, end, { color: head.color, width: head.width });
  }
}

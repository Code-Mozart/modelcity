import { screenToWorld, type Point, type Size, type View } from '../camera/view';
import type { Box } from '../curves/hull';

/** Canvas 2D primitives in screen pixels, plus the world-to-screen mapping of a frame. */
export interface Frame {
  ctx: CanvasRenderingContext2D;
  view: View;
  size: Size;
}

const PALETTE_KEYS = [
  'bg',
  'grid-minor',
  'grid-major',
  'ink',
  'muted',
  'road',
  'road-edge',
  'marking-white',
  'debug',
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

/** The world box that the screen shows, with `extra` meters round it (a stroke or a mark reaches over the edge) (^939). */
export function viewBox(f: Pick<Frame, 'view' | 'size'>, extraM = 0): Box {
  const { width, height } = f.size;
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height },
    { x: width, y: height },
  ].map((c) => screenToWorld(f.view, f.size, c));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    x0: Math.min(...xs) - extraM,
    x1: Math.max(...xs) + extraM,
    y0: Math.min(...ys) - extraM,
    y1: Math.max(...ys) + extraM,
  };
}

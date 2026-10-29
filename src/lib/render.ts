import { gridStep, worldToScreen, type Size, type View } from './view';

/** Canvas 2D drawing of the map. Pure functions of (ctx, view, size): no state, no input. */

// ^2 test object: a 1 m x 2 m box centered on the world origin.
const BOX = { w: 1, h: 2 };

const colors = {
  bg: '#f4f1ea',
  minor: '#e2ded3',
  major: '#cfc9ba',
  box: '#3b6ea8',
  boxFill: '#3b6ea833',
  text: '#333',
};

const MINOR_GRID_MIN_PX = 12;
const SCALE_BAR_MIN_PX = 80;

interface Frame {
  ctx: CanvasRenderingContext2D;
  view: View;
  size: Size;
}

function drawGrid({ ctx, view, size }: Frame, step: number, color: string) {
  const halfW = size.width / 2 / view.scale;
  const halfH = size.height / 2 / view.scale;
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (let x = Math.floor((view.cx - halfW) / step) * step; x <= view.cx + halfW; x += step) {
    const sx = Math.round(worldToScreen(view, size, { x, y: 0 }).x) + 0.5;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, size.height);
  }
  for (let y = Math.floor((view.cy - halfH) / step) * step; y <= view.cy + halfH; y += step) {
    const sy = Math.round(worldToScreen(view, size, { x: 0, y }).y) + 0.5;
    ctx.moveTo(0, sy);
    ctx.lineTo(size.width, sy);
  }
  ctx.stroke();
}

function drawBox({ ctx, view, size }: Frame) {
  const a = worldToScreen(view, size, { x: -BOX.w / 2, y: -BOX.h / 2 });
  ctx.fillStyle = colors.boxFill;
  ctx.fillRect(a.x, a.y, BOX.w * view.scale, BOX.h * view.scale);
  ctx.strokeStyle = colors.box;
  ctx.lineWidth = 2;
  ctx.strokeRect(a.x, a.y, BOX.w * view.scale, BOX.h * view.scale);
  ctx.lineWidth = 1;
}

function formatLength(meters: number): string {
  if (meters >= 1000) return `${meters / 1000} km`;
  return meters >= 1 ? `${meters} m` : `${meters * 100} cm`;
}

function drawScaleBar({ ctx, view, size }: Frame) {
  const meters = gridStep(view.scale, SCALE_BAR_MIN_PX);
  ctx.fillStyle = colors.text;
  ctx.fillRect(16, size.height - 24, meters * view.scale, 3);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(formatLength(meters), 16, size.height - 32);
}

/** Draw one frame. `dpr` is the device pixel ratio of the backing canvas. */
export function render(ctx: CanvasRenderingContext2D, view: View, size: Size, dpr: number) {
  const frame = { ctx, view, size };
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, size.width, size.height);
  const minor = gridStep(view.scale, MINOR_GRID_MIN_PX);
  drawGrid(frame, minor, colors.minor);
  drawGrid(frame, minor * 10, colors.major);
  drawBox(frame);
  drawScaleBar(frame);
}

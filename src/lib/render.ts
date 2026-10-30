import { gridStep, worldToScreen } from './view';
import { readPalette, text, type Frame, type Palette } from './paint';
import { drawScene, type Scene } from './renderPath';

/** Canvas 2D drawing of the map: background, grid, scale bar, then the scene. */

const MINOR_GRID_MIN_PX = 12;
const SCALE_BAR_MIN_PX = 80;

function drawGrid({ ctx, view, size }: Frame, step: number, color: string) {
  const halfW = size.width / 2 / view.scale;
  const halfH = size.height / 2 / view.scale;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
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

function formatLength(meters: number): string {
  if (meters >= 1000) return `${meters / 1000} km`;
  return meters >= 1 ? `${meters} m` : `${meters * 100} cm`;
}

function drawScaleBar({ ctx, view, size }: Frame, pal: Palette) {
  const meters = gridStep(view.scale, SCALE_BAR_MIN_PX);
  ctx.fillStyle = pal.ink;
  ctx.fillRect(16, size.height - 24, meters * view.scale, 3);
  text(ctx, formatLength(meters), { x: 16, y: size.height - 32 }, { color: pal.ink, size: 12 });
}

/** Draw one frame. `dpr` is the device pixel ratio of the backing canvas. */
export function render(frame: Frame, dpr: number, scene: Scene) {
  const { ctx, view, size } = frame;
  const pal = readPalette();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, size.width, size.height);
  const minor = gridStep(view.scale, MINOR_GRID_MIN_PX);
  drawGrid(frame, minor, pal['grid-minor']);
  drawGrid(frame, minor * 10, pal['grid-major']);
  drawScene(frame, scene, pal);
  drawScaleBar(frame, pal);
}

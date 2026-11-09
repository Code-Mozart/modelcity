import type { Hull } from '../curves/hull';
import type { Vec } from '../curves/vec';
import { dot, segment, strokePiece, toScreen, type Frame, type Palette } from './paint';

/** The hulls of the segments and the corners of their crossings, for the debug layer (^925). */
export interface HullScene {
  hulls: Hull[];
  corners: Vec[];
  /** One dot on the skin of each polygon of the surface (^948). */
  dots: Vec[];
}

const HULL_LINE_PX = 1;
/** The dot of a hull vertex, and the arm of the cross of a corner, in pixels. */
const VERTEX_PX = 2.5;
const CROSS_ARM_PX = 6;
const CROSS_LINE_PX = 2;
const WALKER_PX = 6;

/**
 * The hull of every segment as a thin outline, its vertices as dots, and the corners of the
 * crossings as crosses, in the debug red (^925, ^926).
 */
export function drawHulls(f: Frame, scene: HullScene, pal: Palette) {
  const stroke = { color: pal.debug, width: HULL_LINE_PX };
  for (const h of scene.hulls) {
    for (const piece of [...h.sides[0], ...h.sides[1], ...h.caps]) strokePiece(f, piece, stroke);
    for (const v of h.vertices) dot(f.ctx, toScreen(f, v), VERTEX_PX, pal.debug);
  }
  for (const c of scene.corners) {
    const p = toScreen(f, c);
    const cross = { color: pal.debug, width: CROSS_LINE_PX };
    const arm = CROSS_ARM_PX;
    segment(f.ctx, { x: p.x - arm, y: p.y - arm }, { x: p.x + arm, y: p.y + arm }, cross);
    segment(f.ctx, { x: p.x - arm, y: p.y + arm }, { x: p.x + arm, y: p.y - arm }, cross);
  }
  for (const d of scene.dots) dot(f.ctx, toScreen(f, d), WALKER_PX, pal.debug);
}

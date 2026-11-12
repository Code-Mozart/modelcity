import type { Hull } from '../curves/hull';
import type { Vec } from '../curves/vec';
import type { PlacedSign } from '../editor/signs';
import type { Loop } from '../curves/union';
import { drawSigns } from './signGizmo';
import {
  dot,
  fillLoops,
  segment,
  strokeChain,
  strokePiece,
  toScreen,
  type Frame,
  type Palette,
} from './paint';

/** The hulls of the segments and the corners of their crossings, for the debug layer (^925). */
export interface HullScene {
  hulls: Hull[];
  corners: Vec[];
  /** One dot on the skin of each polygon of the surface (^948). */
  dots: Vec[];
  /** What each segment is, as a sign at its middle (^1015). */
  signs: PlacedSign[];
  /** All holes of the surface, before the tiny ones are patched (^1042). */
  holes: Loop[];
  /** The outline round what the hovered lane in meets (^1102). */
  junction: Loop[];
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
  drawAreas(f, scene, pal);
  drawSigns(f, scene.signs, pal);
}

/** Opacity of the fill of a hole of the surface and of the hull of a lane (^1042, ^1102). */
const HOLE_ALPHA = 0.5;
const JUNCTION_ALPHA = 0.12;
const JUNCTION_LINE_PX = 2;

/** All holes of the surface filled with the debug red, half see-through, and the hull round what the hovered lane in meets in orange (^1042, ^1102). */
function drawAreas(f: Frame, scene: HullScene, pal: Palette) {
  const { ctx } = f;
  ctx.save();
  ctx.globalAlpha = HOLE_ALPHA;
  for (const hole of scene.holes) fillLoops(f, [hole], pal.debug, null);
  ctx.globalAlpha = JUNCTION_ALPHA;
  fillLoops(f, scene.junction, pal.orange, null);
  ctx.restore();
  for (const l of scene.junction) strokeChain(f, l, { color: pal.orange, width: JUNCTION_LINE_PX });
}

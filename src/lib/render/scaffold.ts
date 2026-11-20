import { ARROW_PX } from '../curves/handles';
import type { EdgeRef } from '../curves/path';
import type { PathNode } from '../curves/types';
import { fromAngle, type Vec } from '../curves/vec';
import { drawCircles, drawCorners, drawGuides, type RadFocus } from './guides';
import { drawMeasures } from './measures';
import type { Frame, Palette } from './paint';
import { barbs, dot, screenDir, segment, toScreen } from './strokes';

/**
 * The scaffold that is shown (^9, ^60, ^66, `main`'s `drawRoad` and `drawHandles`): of the segments
 * that show it, the heading lines, circles, corners and measurements; the heading arrows of their
 * nodes (and of nodes with no segment, always); and their control points, the hovered or dragged
 * one as large as a selected node (^230).
 */
export interface ScaffoldView {
  refs: (EdgeRef & { rad: RadFocus | null })[];
  arrows: PathNode[];
  points: (Vec & { type: 'head' | 'ctrl' | 'rad'; focused: boolean })[];
}

export const NO_SCAFFOLD: ScaffoldView = { refs: [], arrows: [], points: [] };

const ARROW_STROKE_PX = 2;
const HEAD = { size: 11, spread: 0.5, width: ARROW_STROKE_PX };
const NODE_DOT_PX = 5.5;
const RAD_DOT_PX = 6.5;
const FOCUSED_DOT_PX = NODE_DOT_PX * 1.5;

/** Under the curves: the heading lines and the circles of the arcs. */
export function drawScaffoldUnder(f: Frame, v: ScaffoldView, pal: Palette) {
  for (const ref of v.refs) {
    drawGuides(f, ref, pal);
    drawCircles(f, ref, pal);
  }
}

/** Over the curves, under the node dots: the corners, the measurements, the heading arrows and the control points. */
export function drawScaffoldOver(f: Frame, v: ScaffoldView, pal: Palette) {
  for (const ref of v.refs) {
    drawCorners(f, ref, pal);
    drawMeasures(f, ref, pal, ref.rad);
  }
  for (const n of v.arrows) arrow(f, n, pal.orange);
  for (const h of v.points) {
    const size = h.focused ? FOCUSED_DOT_PX : h.type === 'rad' ? RAD_DOT_PX : NODE_DOT_PX;
    dot(f.ctx, toScreen(f, h), size, pal.orange);
  }
}

/** The heading arrow of a node: the control point sits half way on its stem (^126). */
function arrow(f: Frame, node: PathNode, color: string) {
  const a = toScreen(f, node);
  const t = screenDir(f, fromAngle(node.th));
  const tip = { x: a.x + t.x * 2 * ARROW_PX, y: a.y + t.y * 2 * ARROW_PX };
  segment(f.ctx, a, tip, { color, width: ARROW_STROKE_PX });
  barbs(f.ctx, tip, node.th + f.view.rot, { ...HEAD, color });
}

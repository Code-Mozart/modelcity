import { outlinePx } from '../curves/lane';
import type { SkeletonEdge } from '../map/curve';
import { overlapsView } from '../map/inView';
import type { Frame, Palette } from './paint';
import { trace } from './skeleton';

/** A segment as the surface needs it: its curve and the width of its road (meters). */
export interface SurfaceEdge {
  edge: SkeletonEdge;
  width: number;
}

/**
 * The road surface (^945, ^946, ^1267): the union of the hulls of the segments (each its curve with
 * half its width to each side, cut straight across at its nodes) filled with the road colour, with
 * the outline colour round it (2 px, less on narrow roads). Drawn as strokes: the curves of all
 * segments of one width are one path, stroked once wide in the outline colour and once at the width
 * of the road in the road colour over all of them. A stroked path is filled as one shape, so where
 * hulls overlap or touch (a junction, lanes side by side) there is no seam, and the outline shows
 * only round the union: the same shape as the union of `main`, without working one out.
 */
export function drawSurface(f: Frame, edges: readonly SurfaceEdge[], pal: Palette) {
  const { ctx, view } = f;
  const byWidth = new Map<number, SkeletonEdge[]>();
  const reach = (w: number) => (w * view.scale) / 2 + 2;
  for (const { edge, width } of edges) {
    const seen = overlapsView(view, f.size, reach(width) / view.scale);
    if (seen(edge.box)) (byWidth.get(width) ?? byWidth.set(width, []).get(width)!).push(edge);
  }
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  const paths = [...byWidth].map(([width, list]) => {
    const path = new Path2D();
    for (const e of list) trace(f, e.pieces, path);
    return { px: width * view.scale, path };
  });
  ctx.strokeStyle = pal['road-edge'];
  for (const { px, path } of paths) {
    ctx.lineWidth = px + 2 * outlinePx(px);
    ctx.stroke(path);
  }
  ctx.strokeStyle = pal.road;
  for (const { px, path } of paths) {
    ctx.lineWidth = px;
    ctx.stroke(path);
  }
}

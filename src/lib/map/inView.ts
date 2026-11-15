import type { Size, View } from '../camera/view';
import { viewBox } from '../render/paint';
import type { Box } from '../curves/hull';
import { chunksOf, type ChunkRange } from './chunks';

/** The chunks that the screen touches, with `roomM` meters round it (the world box of a rotated screen is larger than the screen, so it is a little more than what is seen). */
export const chunksInView = (view: View, size: Size, roomM = 0): ChunkRange =>
  chunksOf(viewBox({ view, size }, roomM));

/**
 * Whether a box touches the screen with `roomM` meters round it, as it is turned (^1251): the
 * box of the world that a turned screen has is larger than the screen, and chunks or curves in its
 * corners are not seen. The screen is a rectangle in the world; a box (whose sides are along the
 * axes of the world) and it touch unless one of the four directions of their sides separates them.
 */
export function overlapsView(view: View, size: Size, roomM = 0): (box: Box) => boolean {
  const [hw, hh] = [size.width / 2 / view.scale + roomM, size.height / 2 / view.scale + roomM];
  const [cos, sin] = [Math.cos(view.rot), Math.sin(view.rot)];
  const [ac, as] = [Math.abs(cos), Math.abs(sin)];
  const [ex, ey] = [hw * ac + hh * as, hw * as + hh * ac];
  return (box) => {
    const [bx, by] = [(box.x1 - box.x0) / 2, (box.y1 - box.y0) / 2];
    const [dx, dy] = [(box.x0 + box.x1) / 2 - view.cx, (box.y0 + box.y1) / 2 - view.cy];
    return (
      Math.abs(dx) <= ex + bx &&
      Math.abs(dy) <= ey + by &&
      Math.abs(dx * cos - dy * sin) <= hw + bx * ac + by * as &&
      Math.abs(dx * sin + dy * cos) <= hh + bx * as + by * ac
    );
  };
}

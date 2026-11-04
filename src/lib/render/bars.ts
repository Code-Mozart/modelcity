import { add, mul, type Vec } from '../curves/vec';
import { screenDir, segment, toScreen, type Frame, type Palette } from './paint';

/** A bar beside the nodes of a run of parallel segments (^350). */
export interface BarShape {
  from: Vec;
  to: Vec;
  side: Vec;
}

/**
 * The bars (^350, sketch C of ^355): a line a quarter of the diameter of a node circle thick, over
 * the circles of the nodes of a run on one side, its outer edge on the line that touches them, from
 * the first node to the last; `radius` is the radius of a node circle in pixels.
 */
export function drawBars(f: Frame, bars: BarShape[], radius: number, pal: Palette) {
  for (const { from, to, side } of bars) {
    const width = radius / 2;
    const out = mul(screenDir(f, side), radius - width / 2);
    segment(f.ctx, add(toScreen(f, from), out), add(toScreen(f, to), out), {
      color: pal.ink,
      width,
    });
  }
}

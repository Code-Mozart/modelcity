import { add, mul, type Vec } from '../curves/vec';
import { screenDir, segment, toScreen, type Frame, type Palette } from './paint';

/** A bar beside the nodes of a run of parallel segments (^350). */
export interface BarShape {
  from: Vec;
  to: Vec;
  side: Vec;
}

const BAR_PX = 3;

/**
 * The bars (^350): a thick line that touches the circles of the nodes of a run on one side, like a
 * rubber band around them, from the first node to the last; `radius` is the radius of a node circle in pixels.
 */
export function drawBars(f: Frame, bars: BarShape[], radius: number, pal: Palette) {
  for (const { from, to, side } of bars) {
    const out = mul(screenDir(f, side), radius + BAR_PX / 2);
    segment(f.ctx, add(toScreen(f, from), out), add(toScreen(f, to), out), {
      color: pal.ink,
      width: BAR_PX,
    });
  }
}

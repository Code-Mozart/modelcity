import { add, mul, type Vec } from '../curves/vec';
import { screenDir, segment, toScreen, type Frame, type Palette } from './paint';

/** A bar beside the nodes of a run of parallel segments (^350). */
export interface BarShape {
  from: Vec;
  to: Vec;
  side: Vec;
}

const BAR_PX = 5;

/**
 * The bars (^350): a thick line whose middle runs along the circles of the nodes of a run on one
 * side (centered on where it touches them, not outside), from the first node to the last; `radius` is the radius of a node circle in pixels.
 */
export function drawBars(f: Frame, bars: BarShape[], radius: number, pal: Palette) {
  for (const { from, to, side } of bars) {
    const out = mul(screenDir(f, side), radius);
    segment(f.ctx, add(toScreen(f, from), out), add(toScreen(f, to), out), {
      color: pal.ink,
      width: BAR_PX,
    });
  }
}

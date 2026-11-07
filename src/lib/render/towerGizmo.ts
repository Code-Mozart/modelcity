import { add, mul, type Vec } from '../curves/vec';
import { applyStroke, ring, screenDir, segment, toScreen, type Frame, type Palette } from './paint';

/** A bar on the skin of the capsule of a tower, along a run of parallel segments (^350, ^820). */
export interface BarShape {
  from: Vec;
  to: Vec;
  side: Vec;
}

/** The nodes of a tower, in order across the lanes: drawn as a hollow capsule around them (^820). */
export type TowerCapsule = Vec[];

/** The radius of the ends of the capsule: that of the hover ring (^820, `drawHover`), in pixels. */
export const CAPSULE_PX = 10;
/** The line of the capsule: the thinnest drawn (the grid), in pixels (^820). */
const CAPSULE_LINE_PX = 1;
/** The bars on its skin (^350, ^820): a quarter of the diameter of a node dot, as they were before the capsule (1.4 px and 2.25 px were too thin to see, user). */
const BAR_PX = 2.75;

/**
 * A hollow capsule around the nodes of a tower (^820): a line from the first to the last node, the
 * ends rounded like the hover ring. Under the hover ring and the nodes.
 */
export function drawCapsules(f: Frame, towers: TowerCapsule[], pal: Palette) {
  for (const t of towers) {
    const [a, b] = [toScreen(f, t[0]!), toScreen(f, t.at(-1)!)];
    const [dx, dy] = [b.x - a.x, b.y - a.y];
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      ring(f.ctx, a, CAPSULE_PX, { color: pal.ink, width: CAPSULE_LINE_PX });
      continue;
    }
    const angle = Math.atan2(dy, dx);
    const ctx = f.ctx;
    ctx.beginPath();
    ctx.arc(b.x, b.y, CAPSULE_PX, angle - Math.PI / 2, angle + Math.PI / 2);
    ctx.arc(a.x, a.y, CAPSULE_PX, angle + Math.PI / 2, angle - Math.PI / 2);
    ctx.closePath();
    applyStroke(ctx, { color: pal.ink, width: CAPSULE_LINE_PX });
  }
}

/** The bars, on the skin of the capsules, below the nodes so that selected nodes stay blue (^350, ^820). */
export function drawBars(f: Frame, bars: BarShape[], pal: Palette) {
  for (const { from, to, side } of bars) {
    const out = mul(screenDir(f, side), CAPSULE_PX);
    segment(f.ctx, add(toScreen(f, from), out), add(toScreen(f, to), out), {
      color: pal.ink,
      width: BAR_PX,
    });
  }
}

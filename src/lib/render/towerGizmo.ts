import { add, mul, type Vec } from '../curves/vec';
import { applyStroke, ring, screenDir, toScreen, type Frame, type Palette } from './paint';

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
/** A bar is half as wide as the capsule: from the normal line of the tower to its skin (^820). */
const BAR_PX = CAPSULE_PX;

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

/**
 * The bars (^350, ^820): a hollow rectangle with the line of the capsule, inside it, half as wide
 * as the capsule, from the normal line of the tower to the skin on its side, along a run of
 * parallel segments. Where segments run parallel on both sides the two lines meet on the normal.
 */
export function drawBars(f: Frame, bars: BarShape[], pal: Palette) {
  const ctx = f.ctx;
  for (const { from, to, side } of bars) {
    const [a, b] = [toScreen(f, from), toScreen(f, to)];
    const out = mul(screenDir(f, side), BAR_PX);
    ctx.beginPath();
    for (const p of [a, add(a, out), add(b, out), b]) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    applyStroke(ctx, { color: pal.ink, width: CAPSULE_LINE_PX });
  }
}

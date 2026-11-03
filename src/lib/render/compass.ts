import { fromAngle, type Vec } from '../curves/vec';
import { dot, ring, screenDir, segment, text, toScreen, type Frame, type Palette } from './paint';

/** The heading control point or the first node of an arm is being turned: where the cursor is, or null if the heading was copied (^314, ^316). */
export interface Turning {
  road: number;
  i: number;
  cursor: Vec | null;
  /** The first node of an arm: a compass is shown (^316). */
  compass: boolean;
}

const COMPASS_R = 44;
const COMPASS_GAP = 22;

/** How far the control point is from its node, on the screen: at the cursor while it is dragged (^314). */
export function reachPx(f: Frame, node: Vec, turning: Turning | null, normal: number): number {
  if (!turning?.cursor) return normal;
  const [a, b] = [toScreen(f, node), toScreen(f, turning.cursor)];
  return Math.max(Math.hypot(b.x - a.x, b.y - a.y), 12);
}

/** The bearing of a heading in degrees: 0 is north, counter-clockwise (^316). */
export const bearingOf = (th: number): number =>
  Math.round((((-(th * 180) / Math.PI - 90) % 360) + 360) % 360) % 360;

/**
 * An accurate compass on the side opposite to the heading of the node, with the exact degrees of
 * the heading (^316): north up in the world (it turns with the view), 8 marks, a needle along the heading.
 */
export function drawCompass(f: Frame, node: Vec & { th: number }, pal: Palette) {
  const head = screenDir(f, fromAngle(node.th));
  const at = toScreen(f, node);
  const c = {
    x: at.x - head.x * (COMPASS_R + COMPASS_GAP),
    y: at.y - head.y * (COMPASS_R + COMPASS_GAP),
  };
  const color = pal['orange-ink'];
  f.ctx.globalAlpha = 0.9;
  ring(f.ctx, c, COMPASS_R, { color, width: 1.5 });
  for (let k = 0; k < 8; k++) {
    const d = screenDir(f, fromAngle((k * Math.PI) / 4 - Math.PI / 2));
    const inner = k === 0 ? 0.7 : k % 2 === 0 ? 0.82 : 0.9;
    segment(
      f.ctx,
      { x: c.x + d.x * COMPASS_R * inner, y: c.y + d.y * COMPASS_R * inner },
      { x: c.x + d.x * COMPASS_R, y: c.y + d.y * COMPASS_R },
      { color, width: k === 0 ? 2.5 : 1.5 },
    );
  }
  const north = screenDir(f, { x: 0, y: -1 });
  text(
    f.ctx,
    'N',
    { x: c.x + north.x * (COMPASS_R + 10), y: c.y + north.y * (COMPASS_R + 10) + 4 },
    { color, align: 'center' },
  );
  segment(
    f.ctx,
    c,
    { x: c.x + head.x * COMPASS_R * 0.9, y: c.y + head.y * COMPASS_R * 0.9 },
    { color: pal.orange, width: 2 },
  );
  dot(f.ctx, c, 2.5, color);
  text(f.ctx, `${bearingOf(node.th)}°`, { x: c.x, y: c.y + 20 }, { color, align: 'center' });
  f.ctx.globalAlpha = 1;
}

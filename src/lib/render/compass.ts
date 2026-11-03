import { fromAngle, type Vec } from '../curves/vec';
import { dot, ring, screenDir, text, toScreen, type Frame, type Palette } from './paint';

/** The heading of a node is being set; the first node of an arm shows its heading in degrees with the compass icon (^314, ^316). */
export interface Turning {
  road: number;
  i: number;
  /** The first node of an arm: the label with the compass icon is shown (^316). */
  compass: boolean;
  /** The offset in degrees from the heading before the drag, counter-clockwise, for an existing node (^341); null for the compass. */
  offset: number | null;
}

const ICON_R = 14;
const ICON_GAP = 30;
/** Where along the arrow the offset label sits, pixels from the node. */
const ARROW_REACH_PX = 60;

/** The offset of a heading in degrees (^341): a label beside the arrow of the node, to its left. */
export function drawOffset(f: Frame, node: Vec & { th: number }, offset: number, pal: Palette) {
  const t = screenDir(f, fromAngle(node.th));
  const at = toScreen(f, node);
  const [along, aside] = [ARROW_REACH_PX, 16];
  const p = { x: at.x + t.x * along + t.y * aside, y: at.y + t.y * along - t.x * aside };
  const sign = offset > 0 ? '+' : offset < 0 ? '-' : '';
  text(f.ctx, `${sign}${Math.abs(offset)}°`, p, { color: pal.ink, align: 'center' });
}

/** The bearing of a heading in degrees: 0 is north, counter-clockwise (^316). */
const bearingOf = (th: number): number =>
  Math.round((((-(th * 180) / Math.PI - 90) % 360) + 360) % 360) % 360;

/** A filled triangle from the center to the side of the needle: one half of the compass needle of the middle-button rotation. */
function half(f: Frame, c: Vec, dir: Vec, fill: string) {
  const side = { x: -dir.y, y: dir.x };
  const tip = { x: c.x + dir.x * ICON_R * 0.85, y: c.y + dir.y * ICON_R * 0.85 };
  const w = ICON_R * 0.4;
  f.ctx.beginPath();
  f.ctx.moveTo(tip.x, tip.y);
  f.ctx.lineTo(c.x + side.x * w, c.y + side.y * w);
  f.ctx.lineTo(c.x - side.x * w, c.y - side.y * w);
  f.ctx.closePath();
  f.ctx.fillStyle = fill;
  f.ctx.fill();
}

/**
 * The heading in degrees as a plain label with the compass icon of the middle-button rotation
 * (accurate: the red half points to the north of the world), on the side opposite to the heading (^316).
 */
export function drawCompass(f: Frame, node: Vec & { th: number }, pal: Palette) {
  const head = screenDir(f, fromAngle(node.th));
  const at = toScreen(f, node);
  const c = { x: at.x - head.x * ICON_GAP, y: at.y - head.y * ICON_GAP };
  const north = screenDir(f, { x: 0, y: -1 });
  ring(f.ctx, c, ICON_R, { color: pal.ink, width: 2 });
  half(f, c, north, pal.red);
  half(f, c, { x: -north.x, y: -north.y }, pal.muted);
  dot(f.ctx, c, 1.5, pal.ink);
  // Above the icon while the heading points down, below it while it points up, so the label is not under the arrow.
  const y = head.y > 0 ? c.y - ICON_R - 8 : c.y + ICON_R + 16;
  text(f.ctx, `${bearingOf(node.th)}°`, { x: c.x, y }, { color: pal.ink, align: 'center' });
}

import type { PlacedSign, Sign } from '../editor/signs';
import { toScreen, type Frame, type Palette } from './paint';

/** The radius of a sign, the width of its arrows and the length of the barbs of an arrow head, in pixels. */
const SIGN_PX = 20;
const ARROW_PX = 3;
const HEAD = 0.28;
/** The arrows of a sign are white on the debug red (^926), as the German signs are white on blue. */
const ARROW_COLOR = '#ffffff';

type Pt = [number, number];
/** A line through points, in units of the radius, up being straight on; with an arrow head at its end or not. */
interface Stroke {
  through: Pt[];
  head: boolean;
}

const arrow = (...through: Pt[]): Stroke => ({ through, head: true });

/** The arrows of the prescribed directions (209, 214): one stem, and a branch for each way. */
function directionStrokes(s: Extract<Sign, { kind: 'directions' }>): Stroke[] {
  const alone = !s.straight && s.left !== s.right;
  const tip = (side: number): Pt => (alone ? [0.65 * side, 0] : [0.6 * side, -0.35]);
  const from: Pt = alone ? [0, 0] : [0, 0.1];
  const strokes: Stroke[] = [{ through: [[0, 0.65], from], head: false }];
  if (s.straight) strokes.push(arrow(from, [0, -0.65]));
  if (s.left) strokes.push(arrow(from, tip(-1)));
  if (s.right) strokes.push(arrow(from, tip(1)));
  return strokes;
}

/** A lane added on a side (541), or a lane that ends and merges into the lane on a side (531). */
function laneStrokes(s: Extract<Sign, { kind: 'extension' | 'merge' }>): Stroke[] {
  const side = s.side === 'right' ? 1 : -1;
  if (s.kind === 'extension') {
    const x = -0.25 * side;
    return [
      arrow([x, 0.6], [x, -0.6]),
      arrow([x, 0.4], [x + 0.5 * side, 0.05], [x + 0.5 * side, -0.55]),
    ];
  }
  const x = 0.25 * side;
  const ends: Pt[] = [
    [x - 0.5 * side, 0.55],
    [x - 0.5 * side, 0.15],
    [x, -0.25],
  ];
  return [arrow([x, 0.6], [x, -0.6]), { through: ends, head: false }];
}

function drawStroke(ctx: CanvasRenderingContext2D, { through, head }: Stroke) {
  ctx.beginPath();
  through.forEach(([x, y], i) =>
    i ? ctx.lineTo(x * SIGN_PX, y * SIGN_PX) : ctx.moveTo(x * SIGN_PX, y * SIGN_PX),
  );
  const [[ax, ay], [bx, by]] = [through.at(-2)!, through.at(-1)!];
  const back = Math.atan2(ay - by, ax - bx);
  for (const turn of head ? [-0.6, 0.6] : []) {
    ctx.moveTo(bx * SIGN_PX, by * SIGN_PX);
    ctx.lineTo(
      (bx + HEAD * Math.cos(back + turn)) * SIGN_PX,
      (by + HEAD * Math.sin(back + turn)) * SIGN_PX,
    );
  }
  ctx.stroke();
}

/**
 * The signs of the segments (^1015): a disc each, upright on the screen whichever way the segment
 * or the map is turned.
 */
export function drawSigns(f: Frame, signs: PlacedSign[], pal: Palette) {
  const { ctx } = f;
  for (const { at, sign } of signs) {
    const p = toScreen(f, at);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = pal.debug;
    ctx.beginPath();
    ctx.arc(0, 0, SIGN_PX, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = ARROW_COLOR;
    ctx.lineWidth = ARROW_PX;
    ctx.lineCap = ctx.lineJoin = 'round';
    const strokes = sign.kind === 'directions' ? directionStrokes(sign) : laneStrokes(sign);
    for (const s of strokes) drawStroke(ctx, s);
    ctx.restore();
  }
}

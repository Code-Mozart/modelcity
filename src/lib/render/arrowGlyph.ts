import type { Sign } from '../editor/signs';

/** The barbs of an arrow head, in units of the glyph. */
const HEAD = 0.28;

type Pt = [number, number];
/** A line through points, in units of the radius, up being straight on; with an arrow head at its end or not. */
export interface GlyphStroke {
  through: Pt[];
  head: boolean;
}

const arrow = (...through: Pt[]): GlyphStroke => ({ through, head: true });

/** The arrows of the prescribed directions (209, 214): one stem, and a branch for each way. */
export function directionStrokes(s: Extract<Sign, { kind: 'directions' }>): GlyphStroke[] {
  const alone = !s.straight && s.left !== s.right;
  const tip = (side: number): Pt => (alone ? [0.65 * side, 0] : [0.6 * side, -0.35]);
  const from: Pt = alone ? [0, 0] : [0, 0.1];
  const strokes: GlyphStroke[] = [{ through: [[0, 0.65], from], head: false }];
  if (s.straight) strokes.push(arrow(from, [0, -0.65]));
  if (s.left) strokes.push(arrow(from, tip(-1)));
  if (s.right) strokes.push(arrow(from, tip(1)));
  return strokes;
}

/** A lane added on a side (541), or a lane that ends and merges into the lane on a side (531). */
export function laneStrokes(s: Extract<Sign, { kind: 'extension' | 'merge' }>): GlyphStroke[] {
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

/** The slanted arrow of a lane that ends (Zeichen 297.1-21): on, then over to the side it merges into. */
export function laneEndStrokes(side: 'left' | 'right'): GlyphStroke[] {
  const to = side === 'right' ? 0.55 : -0.55;
  return [arrow([0, 0.65], [0, 0.1], [to, -0.6])];
}

/**
 * Strokes a glyph around the origin of the canvas: a unit of the glyph is `rx` pixels across and
 * `ry` pixels along (up on the glyph is up on the canvas, which the caller has turned).
 */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  strokes: GlyphStroke[],
  { rx, ry }: { rx: number; ry: number },
) {
  for (const { through, head } of strokes) {
    ctx.beginPath();
    through.forEach(([x, y], i) => (i ? ctx.lineTo(x * rx, y * ry) : ctx.moveTo(x * rx, y * ry)));
    const [[ax, ay], [bx, by]] = [through.at(-2)!, through.at(-1)!];
    const back = Math.atan2((ay - by) * ry, (ax - bx) * rx);
    const barb = HEAD * Math.min(rx, ry);
    for (const turn of head ? [-0.6, 0.6] : []) {
      ctx.moveTo(bx * rx, by * ry);
      ctx.lineTo(bx * rx + barb * Math.cos(back + turn), by * ry + barb * Math.sin(back + turn));
    }
    ctx.stroke();
  }
}

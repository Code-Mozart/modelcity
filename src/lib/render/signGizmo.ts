import type { PlacedSign } from '../editor/signs';
import { directionStrokes, drawGlyph, laneStrokes } from './arrowGlyph';
import { toScreen, type Frame, type Palette } from './paint';

/** The radius of a sign, the width of its arrows in pixels. */
const SIGN_PX = 20;
const ARROW_PX = 3;
/** The arrows of a sign are white on the debug red (^926), as the German signs are white on blue. */
const ARROW_COLOR = '#ffffff';

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
    drawGlyph(ctx, strokes, { rx: SIGN_PX, ry: SIGN_PX });
    ctx.restore();
  }
}

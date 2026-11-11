import type { LaneArrow, WaitLine } from '../editor/junctionMarkings';
import type { Marking } from '../editor/markings';
import {
  directionStrokes,
  drawGlyph,
  laneEndStrokes,
  laneStrokes,
  type GlyphStroke,
} from './arrowGlyph';
import { LOGICAL_DASH_PX, LOGICAL_WIDTH_PX, drawMarkings } from './markings';
import { segment, toScreen, type Frame, type Palette } from './paint';

/** The length of a physical arrow (meters, Zeichen 297: about 5 m) and how wide a lane may be for it to fit. */
export const ARROW_LENGTH_M = 5;
/** A physical arrow smaller than this many pixels along is not drawn (^1041). */
const ARROW_MIN_PX = 12;
/** A logical arrow is this many pixels along and as many across (^1041). */
export const LOGICAL_ARROW_PX = 24;
/** Painted arrows, as the lines (^953): white, 2 px at least. */
const ARROW_STROKE_PX = 2;
/** The glyph spans 1.3 units along and 1.3 across. */
const GLYPH_UNITS = 1.3;
/** The width of a physical stop line, Zeichen 294 (meters), and its minimum on the screen (pixels). */
const STOP_LINE_M = 0.5;
/**
 * How far before the place where its lane first meets another segment (^1051) a line is, and then
 * an arrow after a gap: meters for the physical markings, pixels for the logical ones (^1041).
 */
const LINE_BACK = { physical: 1, logical: 10 };
const ARROW_GAP = { physical: 1.5, logical: 10 };

/** The place on the screen `back` pixels before `at`, on the lane that runs the way `th` (world heading). */
function before(f: Frame, at: { x: number; y: number }, th: number, back: number) {
  const p = toScreen(f, at);
  const a = th + f.view.rot;
  return { x: p.x - back * Math.cos(a), y: p.y - back * Math.sin(a) };
}

const strokesOf = (a: LaneArrow): GlyphStroke[] => {
  const s = a.sign;
  if (s.kind === 'directions') return directionStrokes(s);
  return s.kind === 'merge' ? laneEndStrokes(s.side) : laneStrokes(s);
};

export interface ArrowSize {
  along: number;
  across: number;
  shown: boolean;
}

/**
 * How big an arrow on a lane `width` meters wide is on the screen (^1041). Physical: 5 m along,
 * 80% of the lane across (at most 5 m), shown when it is at least a few pixels long. Logical: a
 * fixed number of pixels each way, shown only while the lane is at least as wide as the arrow.
 */
export function arrowSize(width: number, scale: number, physical: boolean): ArrowSize {
  if (physical) {
    const along = ARROW_LENGTH_M * scale;
    return {
      along,
      across: Math.min(width * 0.8, ARROW_LENGTH_M) * scale,
      shown: along >= ARROW_MIN_PX,
    };
  }
  return {
    along: LOGICAL_ARROW_PX,
    across: LOGICAL_ARROW_PX,
    shown: width * scale >= LOGICAL_ARROW_PX,
  };
}

/** How far before the place of its lane (in pixels) the middle of an arrow that is `along` pixels long is: past the line and a gap (^1051). */
function anchorBack(scale: number, physical: boolean, along: number): number {
  const [line, gap] = physical
    ? [LINE_BACK.physical * scale, ARROW_GAP.physical * scale]
    : [LINE_BACK.logical, ARROW_GAP.logical];
  return line + gap + along / 2;
}

/** The painted arrows on the lanes (^1028, ^1029, ^1041), pointing the way the lane runs. */
function drawArrows(f: Frame, arrows: LaneArrow[], pal: Palette, physical: boolean) {
  const { ctx } = f;
  const scale = f.view.scale;
  for (const a of arrows) {
    const { along, across, shown } = arrowSize(a.width, scale, physical);
    if (!shown) continue;
    const back = a.anchored ? anchorBack(f.view.scale, physical, along) : 0;
    const p = before(f, a.at, a.th, back);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a.th + f.view.rot + Math.PI / 2);
    ctx.strokeStyle = pal['marking-white'];
    ctx.lineWidth = physical ? Math.max(0.2 * scale, ARROW_STROKE_PX) : ARROW_STROKE_PX;
    // Round ends, so that the tips of the arrow heads are not cut off (^1053).
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawGlyph(ctx, strokesOf(a), { rx: across / GLYPH_UNITS, ry: along / GLYPH_UNITS });
    ctx.restore();
  }
}

/**
 * The lines across the lanes where traffic waits (^1038): the stop line solid, the give-way line
 * broken (Zeichen 294, 341). Physical: 0.5 m wide and broken in dashes of the lane markings'
 * length; logical: 2 px, broken as the logical dashes are.
 */
function drawWaitLines(f: Frame, lines: WaitLine[], pal: Palette, physical: boolean) {
  const scale = f.view.scale;
  for (const l of lines) {
    const width = physical ? Math.max(STOP_LINE_M * scale, LOGICAL_WIDTH_PX) : LOGICAL_WIDTH_PX;
    const dash = physical ? [0.6 * scale, 0.4 * scale] : [LOGICAL_DASH_PX / 2, LOGICAL_DASH_PX / 2];
    const back = (physical ? LINE_BACK.physical * scale : LINE_BACK.logical) + width / 2;
    const middle = before(f, l.at, l.th, back);
    const across = (l.width * scale) / 2;
    const a = l.th + f.view.rot + Math.PI / 2;
    const [dx, dy] = [across * Math.cos(a), across * Math.sin(a)];
    segment(
      f.ctx,
      { x: middle.x - dx, y: middle.y - dy },
      { x: middle.x + dx, y: middle.y + dy },
      {
        color: pal['marking-white'],
        width,
        dash: l.kind === 'give way' ? dash : undefined,
      },
    );
  }
}

/** Everything painted on the road surface (^949, ^1028, ^1038), and which style it is drawn in (^975, ^1040). */
export interface RoadMarks {
  markings: Marking[];
  waitLines: WaitLine[];
  arrows: LaneArrow[];
  physical: boolean;
}

/** The lines, the lines where traffic waits and the arrows on the road surface, in this order. */
export function drawRoadMarks(f: Frame, marks: RoadMarks, pal: Palette) {
  drawMarkings(f, marks.markings, pal, marks.physical);
  drawWaitLines(f, marks.waitLines, pal, marks.physical);
  drawArrows(f, marks.arrows, pal, marks.physical);
}

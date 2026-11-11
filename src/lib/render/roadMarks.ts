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

/** The painted arrows on the lanes (^1028, ^1029, ^1041), pointing the way the lane runs. */
function drawArrows(f: Frame, arrows: LaneArrow[], pal: Palette, physical: boolean) {
  const { ctx } = f;
  const scale = f.view.scale;
  for (const a of arrows) {
    const { along, across, shown } = arrowSize(a.width, scale, physical);
    if (!shown) continue;
    const p = toScreen(f, a.at);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a.th + f.view.rot + Math.PI / 2);
    ctx.strokeStyle = pal['marking-white'];
    ctx.lineWidth = physical ? Math.max(0.2 * scale, ARROW_STROKE_PX) : ARROW_STROKE_PX;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
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
    segment(f.ctx, toScreen(f, l.from), toScreen(f, l.to), {
      color: pal['marking-white'],
      width,
      dash: l.kind === 'give way' ? dash : undefined,
    });
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

import { DASH_GAP_M, DASH_M, MARKING_MIN_PX, MARKING_WIDTH_M } from '../curves/lane';
import type { Marking } from '../editor/markings';
import { boxesMeet } from '../curves/hull';
import { boxOfPieces, strokeChain, viewBox, type Frame, type Palette, type Stroke } from './paint';

/** Logical markings (^976): a dash and the gap after it are equal, in pixels, and so is the width. The same for every road style and zoom. */
export const LOGICAL_DASH_PX = 10;
export const LOGICAL_WIDTH_PX = 2;

/**
 * How a marking is stroked, on a map of `scale` pixels per meter (^975). Logical (the shown
 * ones, ^976): the dash, the gap and the width are in pixels, so they never grow or hide.
 * Physical: in meters (^954), growing and shrinking with the zoom. The ends are square (^977).
 */
export function markingStroke(
  kind: Marking['kind'],
  scale: number,
  color: string,
  physical: boolean,
): Stroke {
  const dashed = kind === 'dashed';
  if (physical) {
    const width = Math.max(MARKING_WIDTH_M * scale, MARKING_MIN_PX);
    return {
      color,
      width,
      cap: 'butt',
      dash: dashed ? [DASH_M * scale, DASH_GAP_M * scale] : undefined,
    };
  }
  const dash = dashed ? [LOGICAL_DASH_PX, LOGICAL_DASH_PX] : undefined;
  return { color, width: LOGICAL_WIDTH_PX, cap: 'butt', dash };
}

/** The lane markings on the surface (^949 to ^955): all white for now (^953). */
export function drawMarkings(f: Frame, markings: Marking[], pal: Palette, physical: boolean) {
  // Lines off the screen are not stroked (^939); a stroke reaches a few pixels over its box.
  const shown = viewBox(f, 20 / f.view.scale);
  for (const m of markings) {
    if (!boxesMeet(boxOfPieces(m.pieces), shown)) continue;
    const stroke = markingStroke(m.kind, f.view.scale, pal['marking-white'], physical);
    strokeChain(f, m.pieces, stroke);
  }
}

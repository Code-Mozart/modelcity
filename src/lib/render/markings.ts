import { DASH_GAP_M, DASH_M, MARKING_MIN_PX, MARKING_WIDTH_M } from '../curves/lane';
import type { Marking } from '../editor/markings';
import { strokeChain, type Frame, type Palette } from './paint';

/** The lane markings on the surface (^949 to ^955): all white for now (^953), dashes in meters. */
export function drawMarkings(f: Frame, markings: Marking[], pal: Palette) {
  const scale = f.view.scale;
  const width = Math.max(MARKING_WIDTH_M * scale, MARKING_MIN_PX);
  for (const m of markings) {
    const dash = m.kind === 'dashed' ? [DASH_M * scale, DASH_GAP_M * scale] : undefined;
    strokeChain(f, m.pieces, { color: pal['marking-white'], width, dash });
  }
}

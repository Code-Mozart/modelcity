import type { Vec } from '../curves/vec';
import type { SnapHit, Suggestion } from '../snap/types';
import { ring, strokePiece, toScreen, type Frame, type Palette } from './paint';

const LINE_PX = 1.5;
const POINT_PX = 7;

/** A snap line or curve in turquoise (^101, ^263): solid. */
function drawCurve(f: Frame, s: Suggestion, pal: Palette) {
  if (s.kind !== 'curve') return;
  for (const piece of s.pieces) strokePiece(f, piece, { color: pal.turquoise, width: LINE_PX });
}

/** A snap point: a solid turquoise ring, wherever one is shown (^101, ^113, ^803; the glossary). */
export function drawSnapPoint(f: Frame, at: Vec, pal: Palette) {
  ring(f.ctx, toScreen(f, at), POINT_PX, { color: pal.turquoise, width: 2 });
}

/**
 * What the placed or moved node is pulled to (^101): the snap line or curve (both where two cross)
 * and a ring where a snap point is. Only shown while something is snapped.
 */
export function drawSnap(f: Frame, hit: SnapHit | null, pal: Palette) {
  if (!hit) return;
  for (const s of hit.by) drawCurve(f, s, pal);
  const atPoint = hit.by.some((s) => s.kind === 'point') || hit.by.length > 1;
  if (atPoint) drawSnapPoint(f, hit.pt, pal);
}

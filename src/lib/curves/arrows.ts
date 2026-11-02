import { pieceLength, pointOn, type Sample } from './piece';
import type { Piece } from './types';

/**
 * Points along a chain of pieces at regular distances, with the direction of travel (^80). The
 * first one lies `first` from the start, then every `spacing`; all lengths are in the same unit
 * (world meters, so a constant pixel spacing is `px / scale`). `piece` is the index of the piece
 * a point lies on.
 */
export function samplesAlong(
  pieces: Piece[],
  spacing: number,
  first = spacing / 2,
): (Sample & { piece: number })[] {
  const out: (Sample & { piece: number })[] = [];
  let next = first;
  for (const [index, piece] of pieces.entries()) {
    const length = pieceLength(piece);
    if (length < 1e-9) continue;
    for (; next <= length; next += spacing) {
      out.push({ ...pointOn(piece, next / length), piece: index });
    }
    next -= length;
  }
  return out;
}

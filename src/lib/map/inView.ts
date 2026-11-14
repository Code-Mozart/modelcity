import type { Size, View } from '../camera/view';
import { viewBox } from '../render/paint';
import { chunksOf, type ChunkRange } from './chunks';

/** The chunks that the screen touches, with `roomM` meters round it (the world box of a rotated screen is larger than the screen, so it is a little more than what is seen). */
export const chunksInView = (view: View, size: Size, roomM = 0): ChunkRange =>
  chunksOf(viewBox({ view, size }, roomM));

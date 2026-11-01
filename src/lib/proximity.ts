import type { Edge } from './curves/edge';
import { distanceToPiece } from './curves/piece';
import { dist, type Vec } from './curves/vec';

/** The pointer in world meters, with the zoom so that pixel distances can be applied. */
export interface Pointer {
  pt: Vec;
  /** Pixels per meter. */
  scale: number;
}

/** Control points appear when the pointer is this close (screen pixels), see ^55. */
export const HANDLE_NEAR_PX = 48;
/** An edge counts as hovered when the pointer is this close to its curve (screen pixels). */
export const CURVE_NEAR_PX = 20;

export function nearHandle(handle: Vec, pointer: Pointer | null): boolean {
  if (!pointer) return false;
  return dist(handle, pointer.pt) * pointer.scale <= HANDLE_NEAR_PX;
}

export function nearEdge(edge: Edge, pointer: Pointer | null): boolean {
  if (!pointer) return false;
  const reach = CURVE_NEAR_PX / pointer.scale;
  return edge.pieces.some((piece) => distanceToPiece(piece, pointer.pt) <= reach);
}

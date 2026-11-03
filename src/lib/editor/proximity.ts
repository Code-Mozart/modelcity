import type { Edge } from '../curves/edge';
import { distanceToPiece } from '../curves/piece';
import { dist, type Vec } from '../curves/vec';

/** The pointer in world meters, with the zoom so that pixel distances can be applied. */
export interface Pointer {
  pt: Vec;
  /** Pixels per meter. */
  scale: number;
  /** Ctrl is held: snapping is off and the scaffolds are hidden (^101, ^287). */
  ctrl?: boolean;
  /** Alt is held: the other heading (^301). */
  alt?: boolean;
}

/** The pointer of the last position the editor has seen. */
export const pointerOf = (
  info: { pt: Vec; scale: number; ctrl: boolean; alt: boolean } | null,
): Pointer | null => info && { pt: info.pt, scale: info.scale, ctrl: info.ctrl, alt: info.alt };

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

import { dist } from '../curves/vec';
import type { Graph } from '../model/graph';
import type { SnapHit } from '../snap/types';
import { dragStep, placeStep } from './ops';
import { snappedTo } from './snapping';
import { nodesInBand, withNodes, type Band } from './selection';
import { DRAG_PX, type Placement, type PointerInfo, type Press, type Snapshot } from './types';

/** What a pointer move changes while the left button is down (^40, ^70, ^133). */
export interface Moved {
  graph?: Graph;
  band?: Band;
  selection?: number[];
}

function dragMove(
  snap: Snapshot,
  press: Extract<Press, { kind: 'drag' }>,
  info: PointerInfo,
  to: Placement | null,
): Moved | null {
  if (!press.moved && dist(info.pt, press.start) <= DRAG_PX / info.scale) return null;
  press.moved = true;
  return { graph: dragStep(snap, press, info, to) };
}

/**
 * A press moves: dragging a handle, setting the heading of a node being placed, or spanning the
 * selection box (shift keeps the selection and adds to it, ^70, ^72). Marks the press as moved.
 * Null while the pointer is still within the click distance, or when nothing changed.
 */
export function moveOf(
  snap: Snapshot,
  press: Press,
  info: PointerInfo,
  hit: SnapHit | null,
): Moved | null {
  const to = snappedTo(hit, info, press);
  if (press.kind === 'drag') return dragMove(snap, press, info, to);
  if (press.kind === 'place') {
    const graph = placeStep(snap.graph, press, info, to?.th ?? null);
    if (graph === snap.graph) return null;
    press.moved = true;
    return { graph };
  }
  if (!press.moved && dist(info.screen, press.screen) <= DRAG_PX) return null;
  press.moved = true;
  const band = { a: press.screen, b: info.screen };
  return { band, selection: withNodes(press.base, nodesInBand(snap.graph, band, info.project)) };
}

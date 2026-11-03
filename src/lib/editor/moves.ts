import { dist, type Vec } from '../curves/vec';
import type { Graph } from '../model/graph';
import { dragStep, placeStep } from './ops';
import { nodesInBand, withNodes, type Band } from './selection';
import { DRAG_PX, type PointerInfo, type Press, type Snapshot } from './types';

/** What a pointer move changes while the left button is down (^40, ^70, ^133). */
export interface Moved {
  graph?: Graph;
  band?: Band;
  selection?: number[];
}

/**
 * A press moves: dragging a handle, setting the heading of a node being placed, or spanning the
 * selection box (shift keeps the selection and adds to it, ^70, ^72). Marks the press as moved.
 * Null while the pointer is still within the click distance, or when nothing changed.
 */
export function moveOf(snap: Snapshot, press: Press, info: PointerInfo, at?: Vec): Moved | null {
  if (press.kind === 'drag') {
    if (!press.moved && dist(info.pt, press.start) <= DRAG_PX / info.scale) return null;
    press.moved = true;
    return { graph: dragStep(snap, press, at ? { ...info, pt: at } : info) };
  }
  if (press.kind === 'place') {
    const graph = placeStep(snap.graph, press.id, info);
    if (graph === snap.graph) return null;
    press.moved = true;
    return { graph };
  }
  if (!press.moved && dist(info.screen, press.screen) <= DRAG_PX) return null;
  press.moved = true;
  const band = { a: press.screen, b: info.screen };
  return { band, selection: withNodes(press.base, nodesInBand(snap.graph, band, info.project)) };
}

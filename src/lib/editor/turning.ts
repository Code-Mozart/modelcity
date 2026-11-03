import type { Turning } from '../render/compass';
import { headingFrom } from '../snap/heading';
import type { SnapHit } from '../snap/types';
import { positionOf, type Chain } from './chains';
import type { Pointer } from './proximity';
import { turningNode } from './snapping';
import type { Press } from './types';

/** Whether the heading of the node is set by a press that has moved (^314). */
const dragged = (press: Press | null) => press !== null && 'moved' in press && press.moved;

const isCompass = (press: Press) => press.kind === 'place' && press.compass;

/** Where the cursor is, or null while the heading is copied from a snap suggestion. */
function cursorOf({ pointer, snap }: { pointer: Pointer | null; snap: SnapHit | null }) {
  return headingFrom(snap, pointer?.alt ?? false) === null ? (pointer?.pt ?? null) : null;
}

/**
 * The heading being set: of which node (road and index), where the cursor is (null while the heading
 * is copied from a snap suggestion), whether the first node of an arm gets a compass (^314, ^316).
 */
export function turningOf(
  chains: Chain[],
  press: Press | null,
  at: { pointer: Pointer | null; snap: SnapHit | null },
): Turning | null {
  const id = turningNode(press);
  const pos = id === null || !dragged(press) ? null : positionOf(chains, id);
  if (!pos || !press) return null;
  return { road: pos.road, i: pos.node, cursor: cursorOf(at), compass: isCompass(press) };
}

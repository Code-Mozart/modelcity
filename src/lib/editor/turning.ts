import type { Turning } from '../render/compass';
import { positionOf, type Chain } from './chains';
import { turningNode } from './snapping';
import type { Press } from './types';

/** The heading being set by a press that has moved: of which node (road and index), and whether the first node of an arm shows its degrees with the compass icon (^314, ^316). */
export function turningOf(chains: Chain[], press: Press | null): Turning | null {
  const id = turningNode(press);
  if (id === null || !press || !('moved' in press) || !press.moved) return null;
  const pos = positionOf(chains, id);
  return pos && { road: pos.road, i: pos.node, compass: press.kind === 'place' && press.compass };
}

import type { Turning } from '../render/compass';
import { nodeOf } from '../model/graph';
import { positionOf, type Chain } from './chains';
import { turningNode } from './snapping';
import type { Press } from './types';

/** The angle a heading had before it was dragged: where the node pointed when placed, or before the drag (^315). */
const headingBefore = (press: Press): number =>
  press.kind === 'place'
    ? press.angleFrom
    : (nodeOf(press.undo.graph, turningNode(press) ?? -1)?.th ?? 0);

/** An angle in whole degrees between -180 and 180, counter-clockwise positive (the world is y down). */
const offsetDeg = (now: number, before: number): number => {
  const d = Math.round((-(now - before) * 180) / Math.PI);
  return ((((d + 180) % 360) + 360) % 360) - 180;
};

/**
 * The heading being set by a press that has moved: of which node (road and index), whether the first
 * node of an arm shows its degrees with the compass icon (^316), else the offset from where it
 * pointed before (^341).
 */
export function turningOf(chains: Chain[], press: Press | null): Turning | null {
  const id = turningNode(press);
  const pos = id !== null && dragged(press) ? positionOf(chains, id) : null;
  const th = pos ? chains[pos.road]?.path.nodes[pos.node]?.th : undefined;
  if (!pos || !press || th === undefined) return null;
  const compass = isCompass(press);
  return {
    road: pos.road,
    i: pos.node,
    compass,
    offset: compass ? null : offsetDeg(th, headingBefore(press)),
  };
}

const dragged = (press: Press | null) => press !== null && 'moved' in press && press.moved;
const isCompass = (press: Press) => press.kind === 'place' && press.compass;

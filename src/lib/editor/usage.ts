import type { ControlId } from '../hints/hints';
import type { Press } from './types';

/**
 * Which control a finished press used, if it was one of the select operations whose hint is hidden
 * once it is visited (^110): a click on a node or curve, Shift for adding, Alt for a branch, or the
 * selection box. Moving, drawing and clicks on empty canvas are not.
 */
export function controlUsed(press: Press): ControlId | null {
  if (press.kind === 'drag') return press.moved ? null : press.use;
  if (press.kind !== 'empty') return null;
  if (press.moved) return press.shift ? 'select-add' : 'select-box';
  if (!press.curve.length) return null;
  if (press.alt) return 'select-lane';
  return press.shift ? 'select-add' : 'select';
}

import type { Press, Snapshot } from './types';
import { record, type History, type Step } from './history';

const nodes = (n: number) => (n === 1 ? 'node' : `${n} nodes`);

/** The name of a step that only changed the selection (^216): `select 3 nodes`, `deselect node`, `deselect all`. */
export function selectionName(before: number[], after: number[]): string {
  if (after.length === 0) return 'deselect all';
  const added = after.filter((id) => !before.includes(id)).length;
  if (added > 0) return `select ${nodes(added)}`;
  return `deselect ${nodes(before.filter((id) => !after.includes(id)).length)}`;
}

const HANDLE_NAME = {
  node: 'move node',
  head: 'turn heading',
  ctrl: 'bend curve',
  rad: 'change radius',
} as const;

const ACT_NAME = {
  finish: 'finish road',
  cancel: 'cancel first node',
  close: 'close road',
  merge: 'merge road',
  extend: 'extend road',
  split: 'split road',
} as const;

/** What a finished press on a handle did: a move, or a click (^216). */
function dragName(press: Extract<Press, { kind: 'drag' }>): string {
  if (press.moved) {
    const group = press.group.length;
    const handle = press.drag.handle.type;
    return group > 0 && handle === 'node' ? `move ${group + 1} nodes` : HANDLE_NAME[handle];
  }
  if (press.flip) return 'flip arm';
  return press.act ? ACT_NAME[press.act] : 'select';
}

/** What a finished press did (^216), for the name of its step. */
export function pressName(press: Press): string {
  if (press.kind === 'drag') return dragName(press);
  if (press.kind !== 'place') return 'select';
  if (!press.moved && press.then) return ACT_NAME[press.then];
  return press.target.kind === 'curve' ? 'insert node' : 'place node';
}

/** The kind of a step, by what it changed (^216). */
export function kindOf(before: Snapshot, after: Snapshot): Step['kind'] {
  if (before.active !== null || after.active !== null) return 'draw';
  return before.graph === after.graph ? 'select' : null;
}

/**
 * Record a step that took the editor from `before` to `after` (^216): its kind decides its name
 * (a selection change is named by the nodes that changed) and whether it joins the batch before.
 */
export function takeStep(h: History, before: Snapshot, after: Snapshot, name: string) {
  const kind = kindOf(before, after);
  const label = kind === 'select' ? selectionName(before.selection, after.selection) : name;
  const continues = kind === 'select' || before.active !== null;
  const r = record(h, { name: label, kind, before, after, continues });
  return r;
}

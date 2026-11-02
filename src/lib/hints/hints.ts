import type { HandleType } from '../curves/handles';
import type { CurveAction, NodeAction } from '../model/junction';

/** One way of operating the mouse or keyboard, shown as a symbol (^49). */
export type Input =
  | { kind: 'mouse'; button: 'lmb' | 'mmb' | 'rmb'; drag?: boolean; shift?: boolean; alt?: boolean }
  | { kind: 'wheel' }
  | { kind: 'key'; label: string }
  /** Keys pressed together, e.g. Ctrl+Z. */
  | { kind: 'keys'; labels: string[] };

/**
 * The controls whose hints are hidden after the user used them, each on its own (^110): the camera
 * controls, the select operations, and undo and redo. Not those of draw mode and of moving, which
 * depend on what is under the pointer.
 */
export type ControlId =
  | 'pan'
  | 'zoom'
  | 'rotate'
  | 'select'
  | 'select-box'
  | 'select-add'
  | 'select-lane'
  | 'deselect-all'
  | 'delete-selected'
  | 'undo'
  | 'redo';

/** A control hint: the inputs (alternatives) and what they do, e.g. [Esc] or [RMB]: finish. */
export interface Hint {
  inputs: Input[];
  text: string;
  /** The control, if it can be learned: its hint is hidden for a while after it was used (^110). */
  id?: ControlId;
  /** What a held key changes: `(Alt to undo batch)`. */
  note?: { key: string; text: string };
}

/** What the pointer is over, for contextual hints. */
export type HintTarget =
  | { kind: 'empty' }
  /** `picked`: how many of the curve's two nodes are selected. */
  | { kind: 'curve'; picked?: number; act?: CurveAction; lane?: boolean }
  | { kind: 'handle'; type: HandleType; act: NodeAction; selected?: boolean; lane?: boolean };

export const mouse = (
  button: 'lmb' | 'mmb' | 'rmb',
  drag = false,
  mod?: 'shift' | 'alt',
): Input => ({
  kind: 'mouse',
  button,
  drag,
  shift: mod === 'shift',
  alt: mod === 'alt',
});
export const hint = (input: Input | Input[], text: string, id?: ControlId): Hint => ({
  inputs: Array.isArray(input) ? input : [input],
  text,
  ...(id ? { id } : {}),
});

export const ESC: Input = { kind: 'key', label: 'Esc' };
export const ENTER: Input = { kind: 'key', label: 'Enter' };
const DEL: Input = { kind: 'key', label: 'Del' };
const keys = (...labels: string[]): Input => ({ kind: 'keys', labels });

const CAMERA: Hint[] = [
  hint(mouse('rmb', true), 'pan', 'pan'),
  hint({ kind: 'wheel' }, 'zoom', 'zoom'),
  hint(mouse('mmb', true), 'rotate', 'rotate'),
];

type HandleTarget = Extract<HintTarget, { kind: 'handle' }>;

const DRAG_TEXT: Record<HandleType, string> = {
  node: 'move node',
  head: 'turn heading',
  ctrl: 'bend curve',
  mid1: 'turn heading',
  mid2: 'turn heading',
  rad: 'change radius',
};

/**
 * What the left button does on a handle. In draw mode a click on a node finishes, extends, splits or
 * merges the road (^23, ^65); the hint is that verb (^141).
 */
function handleHints(target: HandleTarget): Hint[] {
  const { type, act } = target;
  const out: Hint[] = [];
  if (act) out.push(hint(mouse('lmb'), act));
  out.push(hint(mouse('lmb', true), DRAG_TEXT[type]));
  if (type === 'node') out.push(hint(mouse('rmb'), 'delete node'));
  return out;
}

/** What a left click on a curve or on empty canvas does in draw mode (^23). */
function curveText(target: HintTarget): string {
  if (target.kind !== 'curve') return 'add node';
  if (target.act === 'split') return 'split';
  return 'merge';
}

/** Draw mode: a road is being drawn. */
function drawModeHints(target: HintTarget): Hint[] {
  if (target.kind === 'handle') {
    const rows = handleHints(target);
    // On a node a right click deletes it, so only Esc finishes there.
    const finish =
      target.type === 'node' ? hint(ESC, 'finish') : hint([ESC, mouse('rmb')], 'finish');
    return [...rows, finish];
  }
  const drag = target.kind === 'curve' ? 'insert and set heading' : 'add node and set heading';
  return [
    hint(mouse('lmb'), curveText(target)),
    hint(mouse('lmb', true), drag),
    ...(target.kind === 'curve'
      ? [hint(ESC, 'finish'), hint(mouse('rmb'), 'remove segment')]
      : [hint([ESC, mouse('rmb')], 'finish')]),
  ];
}

/** The Alt row: select the branch under the pointer, or deselect it if it is wholly selected (^128). */
function laneHint(target: HintTarget): Hint {
  const selected = target.kind !== 'empty' && target.lane;
  const text = selected ? 'deselect lane' : 'select lane';
  return hint(mouse('lmb', false, 'alt'), text, 'select-lane');
}

/**
 * Selecting with the left button, by what is under the pointer (^72, ^74, ^75, ^128). With nothing
 * selected, Shift would add nothing to what LMB does, so no Shift row then.
 */
function pickHints(target: HintTarget, selected: number): Hint[] {
  const shift = (text: string) => hint(mouse('lmb', false, 'shift'), text, 'select-add');
  const instead = selected > 0 ? ' instead' : '';
  if (target.kind === 'handle' && target.type === 'node') {
    if (target.selected) return [shift('deselect'), laneHint(target)];
    const add = selected > 0 ? [shift('select')] : [];
    return [hint(mouse('lmb'), `select${instead}`, 'select'), ...add, laneHint(target)];
  }
  if (target.kind !== 'curve') return [];
  const all = target.picked === 2;
  return [
    ...(all ? [] : [hint(mouse('lmb'), `select both nodes${instead}`, 'select')]),
    ...(selected > 0 ? [shift(all ? 'deselect both nodes' : 'add both nodes to selection')] : []),
    laneHint(target),
  ];
}

/** Select mode: no road is being drawn. */
function selectModeHints(target: HintTarget, selected: number): Hint[] {
  const handle = target.kind === 'handle';
  const empty = target.kind === 'empty';
  const box = [hint(mouse('lmb', true), 'select', 'select-box')];
  if (selected && !handle) {
    box.push(hint(mouse('lmb', true, 'shift'), 'add to selection', 'select-add'));
  }
  const click = empty ? [hint(mouse('lmb'), selected ? 'deselect all' : 'draw mode')] : [];
  return [
    ...(handle ? handleHints(target) : [...click, ...box]),
    ...pickHints(target, selected),
    ...(selected
      ? [hint(ESC, 'deselect all', 'deselect-all'), hint(DEL, 'delete selected', 'delete-selected')]
      : []),
    ...(target.kind === 'curve' ? [hint(mouse('rmb'), 'remove segment')] : []),
    ...CAMERA,
  ];
}

/** Whether the user used a control lately, so that its hint is hidden (^110). */
export type Hidden = (id: ControlId) => boolean;

const learned = (row: Hint, hidden: Hidden) => row.id !== undefined && hidden(row.id);

/** What can be undone or redone right now (^81). */
export interface HistoryState {
  undo: boolean;
  redo: boolean;
}

/**
 * Undo and redo, only while there is something to undo or redo (^81); holding Alt does it by batch,
 * and a step alone is a batch of one (^103), which the note says. They are shown in the recent history panel (^109).
 */
export function historyHints({ undo, redo }: HistoryState, hidden: Hidden = () => false): Hint[] {
  const note = (text: string) => ({ key: 'Alt', text });
  const redoKeys = [keys('Ctrl', 'Y'), keys('Ctrl', 'Shift', 'Z')];
  const rows = [
    ...(undo ? [{ ...hint(keys('Ctrl', 'Z'), 'undo', 'undo'), note: note('to undo batch') }] : []),
    ...(redo ? [{ ...hint(redoKeys, 'redo', 'redo'), note: note('to redo batch') }] : []),
  ];
  return rows.filter((r) => !learned(r, hidden));
}

/**
 * The hints for the top left corner, for the current mode, what is under the pointer and how many
 * nodes are selected (^49).
 */
/** The project controls are always shown for now (^168). */
const PROJECT_HINTS: Hint[] = [
  hint(keys('Ctrl', 'S'), 'save'),
  hint([{ kind: 'key', label: 'P' }, keys('Ctrl', 'O')], 'projects'),
];

export function hintsFor(
  drawing: boolean,
  target: HintTarget,
  selected = 0,
  hidden: Hidden = () => false,
): Hint[] {
  const rows = drawing ? drawModeHints(target) : selectModeHints(target, selected);
  return [...rows.filter((r) => !learned(r, hidden)), ...PROJECT_HINTS];
}

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
  | 'redo'
  | 'view'
  | 'pin'
  | 'copy-heading';

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
  | { kind: 'curve'; picked?: number; act?: CurveAction; lane?: boolean; onSelection?: boolean }
  | {
      kind: 'handle';
      type: HandleType;
      act: NodeAction;
      selected?: boolean;
      lane?: boolean;
      /** A right click removes the whole selection, which has several nodes (^290, ^779). */
      onSelection?: boolean;
    };

export const mouse = (
  button: 'lmb' | 'mmb' | 'rmb',
  drag = false,
  mod?: 'shift' | 'alt' | 'alt+shift',
): Input => ({
  kind: 'mouse',
  button,
  drag,
  shift: mod === 'shift' || mod === 'alt+shift',
  alt: mod === 'alt' || mod === 'alt+shift',
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
  // Finishing is one row: the click on the node being drawn from, or Esc (^239).
  if (act === 'finish' || act === 'cancel') out.push(hint([mouse('lmb'), ESC], act));
  else if (act) out.push(hint(mouse('lmb'), act));
  out.push(hint(mouse('lmb', true), DRAG_TEXT[type]));
  if (type === 'node') {
    out.push(hint(mouse('rmb'), target.onSelection ? DELETE_SELECTED : 'delete node'));
  }
  if (type === 'head') out.push(hint(mouse('lmb', false, 'alt'), 'flip arm'));
  return out;
}

/** What a left click on a curve or on empty canvas does in draw mode (^23). */
function curveText(target: HintTarget): string {
  if (target.kind !== 'curve') return 'add node';
  if (target.act === 'split') return 'split';
  return 'merge';
}

/** What a right click on a node or a segment of the selection does, whatever is under the pointer (^290, ^779). */
const DELETE_SELECTED = 'delete selected nodes';

/** Over a curve a right click removes the segment, with Alt its whole branch (^160); between selected nodes it removes the selection (^779). */
const segmentRemoval = (target: HintTarget): Hint[] =>
  target.kind === 'curve' && target.onSelection
    ? [hint([mouse('rmb'), mouse('rmb', false, 'alt')], DELETE_SELECTED)]
    : [hint(mouse('rmb'), 'remove segment'), hint(mouse('rmb', false, 'alt'), 'remove branch')];

/** Draw mode: a road is being drawn; the camera works as everywhere (^389). `finish` is `cancel` while only the first node is placed (^438). */
const drawModeHints = (target: HintTarget, finish: string): Hint[] => [
  ...drawRows(target, finish),
  ...CAMERA,
];

function drawRows(target: HintTarget, finish: string): Hint[] {
  if (target.kind === 'handle') {
    const rows = handleHints(target);
    // On a node a right click deletes it, so only Esc finishes there.
    const way = target.type === 'node' ? hint(ESC, finish) : hint([ESC, mouse('rmb')], finish);
    return target.act === 'finish' || target.act === 'cancel' ? rows : [...rows, way];
  }
  const drag = target.kind === 'curve' ? 'insert and set heading' : 'add node and set heading';
  return [
    hint(mouse('lmb'), curveText(target)),
    hint(mouse('lmb', true), drag),
    ...(target.kind === 'curve'
      ? [hint(ESC, finish), ...segmentRemoval(target)]
      : [hint([ESC, mouse('rmb')], finish)]),
  ];
}

/** The Alt row: select the branch under the pointer, or deselect it if it is wholly selected (^128). */
function laneHint(target: HintTarget): Hint {
  const selected = target.kind !== 'empty' && target.lane;
  const text = selected ? 'deselect branch' : 'select branch';
  return hint(mouse('lmb', false, 'alt'), text, 'select-lane');
}

/** The Alt+Shift row: add the branch to the selection, or deselect it if it is wholly selected (^244). */
function branchAddHint(target: HintTarget): Hint {
  const selected = target.kind !== 'empty' && target.lane;
  const text = selected ? 'deselect branch' : 'add branch to selection';
  return hint(mouse('lmb', false, 'alt+shift'), text, 'select-lane');
}

/** The Alt rows of a node or a curve: select the branch, and with something selected add it (^128, ^244). */
const branchHints = (target: HintTarget, selected: number): Hint[] => [
  laneHint(target),
  ...(selected > 0 ? [branchAddHint(target)] : []),
];

const shiftRow = (text: string) => hint(mouse('lmb', false, 'shift'), text, 'select-add');

/** Selecting with the left button over a node (^72, ^75, ^128). */
function nodePickHints(target: Extract<HintTarget, { kind: 'handle' }>, selected: number): Hint[] {
  const branch = branchHints(target, selected);
  if (target.selected) return [shiftRow('deselect'), ...branch];
  const add = selected > 0 ? [shiftRow('select')] : [];
  const instead = selected > 0 ? ' instead' : '';
  return [hint(mouse('lmb'), `select${instead}`, 'select'), ...add, ...branch];
}

/**
 * Selecting with the left button, by what is under the pointer (^72, ^74, ^75, ^128). With nothing
 * selected, Shift would add nothing to what LMB does, so no Shift row then.
 */
function pickHints(target: HintTarget, selected: number): Hint[] {
  if (target.kind === 'handle' && target.type === 'node') return nodePickHints(target, selected);
  if (target.kind !== 'curve') return [];
  const all = target.picked === 2;
  const instead = selected > 0 ? ' instead' : '';
  return [
    ...(all ? [] : [hint(mouse('lmb'), `select segment${instead}`, 'select')]),
    ...(selected > 0 ? [shiftRow(all ? 'deselect segment' : 'add segment to selection')] : []),
    ...branchHints(target, selected),
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
    ...(target.kind === 'curve' ? segmentRemoval(target) : []),
    ...CAMERA,
  ];
}

/** Whether the user used a control lately, so that its hint is hidden (^110). */
export type Hidden = (id: ControlId) => boolean;

const visited = (row: Hint, hidden: Hidden) => row.id !== undefined && hidden(row.id);

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
  return rows.filter((r) => !visited(r, hidden));
}

/**
 * The hints for the top left corner, for the current mode, what is under the pointer and how many
 * nodes are selected (^49).
 */
/** The project controls are always shown for now (^168). */
const PROJECT_HINTS: Hint[] = [hint({ kind: 'key', label: 'P' }, 'projects')];

/** Tab switches to view mode, and back (^104); hidden once visited like the other controls (^110). */
const tabHints = (text: string, hidden: Hidden): Hint[] =>
  [hint({ kind: 'key', label: 'Tab' }, text, 'view')].filter((r) => !visited(r, hidden));

/** View mode: only the camera and the way out, which is never hidden: it is the only way (^384). */
export const viewHints = (hidden: Hidden = () => false): Hint[] => [
  ...tabHints('select mode', () => false),
  ...CAMERA.filter((r) => !visited(r, hidden)),
  ...PROJECT_HINTS,
];

/** What else the hints depend on: what was visited lately (^110), the pins, whether a node snaps, the compass (^258, ^101). */
export interface HintState {
  hidden?: Hidden;
  /** A handle is being dragged: what it is and whether letting go merges it (^286). */
  drag?: { type: HandleType; merge: boolean; place?: boolean } | null;
  pinned?: number;
  snapping?: boolean;
  /** The pointer snapped to a touching point, whose heading `Alt` inverts (^254, ^301). */
  touching?: boolean;
  /** A click would place a node at the snap *with a heading*: `Shift` keeps only the position (^358, ^481). */
  placing?: boolean;
  /** The middle button is held: the compass uses `S` and the other letters. */
  rotating?: boolean;
  /** Only the first node of the road is placed: finishing takes it away, which is `cancel` (^438). */
  firstNodeOnly?: boolean;
}

/** Ctrl while the editor snaps, and the pin; neither can be visited, so they are never hidden (^101, ^258). */
function snapHints(selected: number, s: HintState): Hint[] {
  const ctrl = [
    ...(s.snapping ? [hint({ kind: 'key', label: 'Ctrl' }, 'no snapping')] : []),
    ...(s.snapping && s.placing
      ? [hint({ kind: 'key', label: 'Shift' }, 'snap only the position')]
      : []),
    ...(s.touching ? [hint({ kind: 'key', label: 'Alt' }, 'opposite heading')] : []),
  ];
  const key = { kind: 'key', label: 'S' } as const;
  if (s.rotating) return ctrl;
  if (selected > 0) return [...ctrl, hint(key, 'pin snap suggestions')];
  return s.pinned ? [...ctrl, hint(key, 'unpin all snap suggestions')] : ctrl;
}

/** While a handle is dragged only what matters now: what the drag does, what a key changes, and whether it merges (^286). */
function dragHints(
  { type, merge, place }: { type: HandleType; merge: boolean; place?: boolean },
  s: HintState,
): Hint[] {
  const key = (label: string, text: string) => hint({ kind: 'key', label }, text);
  return [
    hint(mouse('lmb', true), DRAG_TEXT[type]),
    ...(merge ? [hint(mouse('lmb'), 'merge on release')] : []),
    hint(ESC, 'cancel'),
    ...(s.snapping || type === 'head' ? [key('Ctrl', 'no snapping')] : []),
    ...(s.touching ? [key('Alt', 'opposite heading')] : []),
    // A moved node takes the heading of the snap, unless `Shift` keeps only its position (^796, ^358).
    ...(type === 'node' && s.touching ? [key('Shift', 'snap only the position')] : []),
    // Aiming (^335) is for the heading of an existing node; not while one that was just placed is set (^358).
    ...(type === 'head' && !place
      ? [key('Shift', 'aim at snap suggestion'), key('Shift+Alt', 'aim away from snap suggestion')]
      : []),
  ];
}

export function hintsFor(
  drawing: boolean,
  target: HintTarget,
  selected = 0,
  state: HintState = {},
): Hint[] {
  if (state.drag) return dragHints(state.drag, state);
  const hidden = state.hidden ?? (() => false);
  const rows = drawing
    ? drawModeHints(target, state.firstNodeOnly ? 'cancel' : 'finish')
    : selectModeHints(target, selected);
  return [
    ...tabHints('view mode', hidden),
    ...rows.filter((r) => !visited(r, hidden)),
    ...snapHints(selected, state),
    ...PROJECT_HINTS,
  ];
}

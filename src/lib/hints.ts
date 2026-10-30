import type { HandleType } from './curves/handles';

/** One way of operating the mouse or keyboard, shown as a symbol (^49). */
export type Input =
  | { kind: 'mouse'; button: 'lmb' | 'mmb' | 'rmb'; drag?: boolean; shift?: boolean }
  | { kind: 'wheel' }
  | { kind: 'key'; label: string };

/** A control hint: the inputs (alternatives) and what they do, e.g. [Esc] or [RMB]: finish. */
export interface Hint {
  inputs: Input[];
  text: string;
}

/** What the pointer is over, for contextual hints. */
export type HintTarget =
  | { kind: 'empty' }
  /** `picked`: how many of the curve's two nodes are selected. */
  | { kind: 'curve'; picked?: number }
  | { kind: 'handle'; type: HandleType; last: boolean; leaf: boolean; selected?: boolean };

const mouse = (button: 'lmb' | 'mmb' | 'rmb', drag = false, shift = false): Input => ({
  kind: 'mouse',
  button,
  drag,
  shift,
});
const hint = (input: Input | Input[], text: string): Hint => ({
  inputs: Array.isArray(input) ? input : [input],
  text,
});

const ESC: Input = { kind: 'key', label: 'Esc' };
const DEL: Input = { kind: 'key', label: 'Del' };

const CAMERA: Hint[] = [
  hint(mouse('rmb', true), 'pan'),
  hint({ kind: 'wheel' }, 'zoom'),
  hint(mouse('mmb', true), 'rotate'),
];

type HandleTarget = Extract<HintTarget, { kind: 'handle' }>;

const DRAG_TEXT: Record<HandleType, string> = {
  node: 'move node',
  head: 'turn heading',
  ctrl: 'bend curve',
  s1: 'change radius',
  s2: 'change radius',
  rad: 'change radius',
};

/**
 * What the left button does on a handle. In draw mode, clicking the node being drawn from ends the
 * road, and clicking another leaf node extends the road from it (^65).
 */
function handleHints(target: HandleTarget, drawing: boolean): Hint[] {
  const { type, last, leaf } = target;
  const out: Hint[] = [];
  if (type === 'node' && drawing && last) out.push(hint(mouse('lmb'), 'finish road'));
  else if (type === 'node' && drawing && leaf) out.push(hint(mouse('lmb'), 'extend road'));
  out.push(hint(mouse('lmb', true), DRAG_TEXT[type]));
  if (type === 'node') out.push(hint(mouse('rmb'), 'delete node'));
  return out;
}

/** Draw mode: a road is being drawn. */
function drawModeHints(target: HintTarget): Hint[] {
  if (target.kind === 'handle') {
    const rows = handleHints(target, true);
    // On a node a right click deletes it, so only Esc finishes there.
    const finish =
      target.type === 'node' ? hint(ESC, 'finish') : hint([ESC, mouse('rmb')], 'finish');
    return [...rows, finish];
  }
  const what = target.kind === 'curve' ? 'insert node' : 'add node';
  return [
    hint(mouse('lmb'), what),
    hint(mouse('lmb', true), `${what} with heading`),
    hint([ESC, mouse('rmb')], 'finish'),
  ];
}

/** Selecting with the left button, by what is under the pointer (^72, ^74). */
function pickHints(target: HintTarget): Hint[] {
  const shift = (text: string) => hint(mouse('lmb', false, true), text);
  if (target.kind === 'handle') {
    if (target.type !== 'node') return [];
    return target.selected ? [shift('deselect')] : [hint(mouse('lmb'), 'select'), shift('select')];
  }
  if (target.kind === 'curve') {
    const all = target.picked === 2;
    return [
      ...(all ? [] : [hint(mouse('lmb'), 'select both nodes')]),
      shift(all ? 'deselect both nodes' : 'add both nodes to selection'),
    ];
  }
  return [];
}

/** Select mode: no road is being drawn. */
function selectModeHints(target: HintTarget, selected: number): Hint[] {
  const handle = target.kind === 'handle';
  const box = [hint(mouse('lmb', true), 'select')];
  if (selected && !handle) box.push(hint(mouse('lmb', true, true), 'add to selection'));
  return [
    ...(handle ? [] : target.kind === 'empty' ? [hint(mouse('lmb'), 'draw mode')] : []),
    ...(handle ? handleHints(target, false) : box),
    ...pickHints(target),
    ...(selected ? [hint(DEL, 'delete selected')] : []),
    ...CAMERA,
  ];
}

/**
 * The hints for the top left corner, for the current mode, what is under the pointer and how many
 * nodes are selected (^49).
 */
export function hintsFor(drawing: boolean, target: HintTarget, selected = 0): Hint[] {
  return drawing ? drawModeHints(target) : selectModeHints(target, selected);
}

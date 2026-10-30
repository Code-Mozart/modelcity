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
  | { kind: 'curve' }
  | { kind: 'handle'; type: HandleType; last: boolean; leaf: boolean };

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

/** Select mode: no road is being drawn. */
function selectModeHints(target: HintTarget): Hint[] {
  if (target.kind === 'handle') {
    const toggle =
      target.type === 'node' ? [hint(mouse('lmb', false, true), 'toggle selected')] : [];
    return [...handleHints(target, false), ...toggle, ...CAMERA];
  }
  return [
    hint(mouse('lmb'), 'draw mode'),
    hint(mouse('lmb', true), 'select nodes'),
    hint(mouse('lmb', true, true), 'add to selection'),
    ...CAMERA,
  ];
}

/** The control hints for the top left corner, for the current mode and what is under the pointer (^49). */
export function hintsFor(drawing: boolean, target: HintTarget): Hint[] {
  return drawing ? drawModeHints(target) : selectModeHints(target);
}

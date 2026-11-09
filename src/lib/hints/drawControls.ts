import {
  always,
  act,
  curveAct,
  draw,
  finishWord,
  isNode,
  lmb,
  onCurve,
  onVoid,
  rmb,
  handle,
  actRow,
  nodeAct,
  type C,
  type Facts,
} from './facts';
import { ESC, mouse } from './inputs';

/** Reaching a node or curve while drawing: a merge going forwards, a split going backwards (^916). */
const joinWord = (f: Facts) => (f.state.backwards ? 'split' : 'merge');

/** The way a click on a leaf node extends (^916). */
const way = (f: Facts) => handle(f)?.way;

/** `Alt`+`LMB` over something, with what it says. */
const altRow = (hat: number, text: string, on: (f: Facts) => boolean): C => ({
  hat,
  input: mouse('lmb', false, 'alt'),
  on,
  listens: always,
  says: () => text,
});

/** A click and a drag in draw and extend mode: what a click on a node does, on the void, on a curve (^412 to ^716, ^410, ^411, ^707, ^715, ^708). */
export const DRAW_HEAD: C[] = [
  // What a click on a node does in draw and extend mode (^412, ^436, ^496, ^706, ^714, ^716, ^711).
  { ...actRow(412, 'finish', nodeAct('finish')), input: [lmb, ESC] },
  { ...actRow(436, 'cancel', nodeAct('cancel')), input: [lmb, ESC] },
  // Extend a leaf node: a click goes the way the branch grows, `Alt` the other way (^496, ^916, ^915, ^917).
  actRow(496, 'extend forwards', (f) => nodeAct('extend')(f) && way(f) === 'forwards'),
  actRow(916, 'extend backwards', (f) => nodeAct('extend')(f) && way(f) === 'backwards'),
  altRow(915, 'extend backwards', (f) => nodeAct('extend')(f) && way(f) === 'forwards'),
  altRow(917, 'extend forwards', (f) => nodeAct('extend')(f) && way(f) === 'backwards'),
  actRow(706, 'split', nodeAct('split')),
  { ...actRow(714, '', nodeAct('merge')), says: joinWord },
  actRow(716, 'close', nodeAct('close')),
  {
    ...actRow(711, '', (f) => draw(f) && handle(f)?.type === 'rad' && act(f) !== null),
    says: (f) => (act(f) === 'merge' ? joinWord(f) : act(f)),
  },
  // A click and a drag on the void and on a curve in draw and extend mode (^410, ^411, ^707, ^715, ^708).
  {
    hat: 410,
    input: lmb,
    on: (f) => draw(f) && onVoid(f),
    listens: always,
    says: (f) => (f.state.extending ? 'place node' : 'place first node'),
  },
  {
    hat: 707,
    input: lmb,
    on: (f) => draw(f) && onCurve(f) && curveAct(f) === 'split',
    listens: always,
    says: () => 'split',
  },
  {
    hat: 715,
    input: lmb,
    on: (f) => draw(f) && onCurve(f) && curveAct(f) !== 'split',
    listens: always,
    says: joinWord,
  },
  {
    hat: 411,
    input: mouse('lmb', true),
    on: (f) => draw(f) && onVoid(f),
    listens: always,
    says: (f) =>
      f.state.extending ? 'place node and set heading' : 'place first node and set heading',
  },
  {
    hat: 708,
    input: mouse('lmb', true),
    on: (f) => draw(f) && onCurve(f),
    listens: always,
    says: () => 'insert and set heading',
  },
];

/** Finishing a road in draw and extend mode (^720, ^713). */
export const DRAW_TAIL: C[] = [
  // Finishing a road in draw and extend mode: `Esc`, and a right click where it does not delete or remove (^720, ^713, ^467).
  {
    hat: 720,
    input: [ESC, rmb],
    on: (f) => draw(f) && (onVoid(f) || (!!handle(f) && !isNode(f))),
    listens: always,
    says: finishWord,
  },
  {
    hat: 713,
    input: ESC,
    on: (f) => draw(f) && (onCurve(f) || (isNode(f) && act(f) !== 'finish' && act(f) !== 'cancel')),
    listens: always,
    says: finishWord,
  },
];

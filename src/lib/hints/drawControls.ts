import type { NodeAction } from '../editor/drawing';
import { hintsOf, type Control } from './controls';
import type { Hint } from './hints';
import { ESC, key, mouse } from './inputs';

/**
 * What the controls of draw and extend mode need to know (^181, ^1262; `main`'s `drawControls.ts`):
 * whether a road is drawn, what is under the pointer and what a click does there.
 */
export interface DrawFacts {
  drawing: boolean;
  /** A road is being drawn (extend mode, ^120). */
  extending: boolean;
  /** Only the first node of the road is placed (^437). */
  firstNodeOnly: boolean;
  /** The road is drawn backwards: reaching a node splits rather than merges (^916). */
  backwards: boolean;
  hovered: 'node' | 'segment' | null;
  /** What a click on the hovered node does. */
  act: NodeAction | null;
  /** The way a click on the hovered leaf node extends (^916). */
  way: 'forwards' | 'backwards' | null;
}

const lmb = mouse('lmb');
const rmb = mouse('rmb');
const yes = () => true;
const draw = (f: DrawFacts) => f.drawing;
const onVoid = (f: DrawFacts) => draw(f) && f.hovered === null;
const onCurve = (f: DrawFacts) => draw(f) && f.hovered === 'segment';
const onNode = (f: DrawFacts) => draw(f) && f.hovered === 'node';
const nodeAct = (a: NodeAction) => (f: DrawFacts) => onNode(f) && f.act === a;
/** Reaching a node or curve while drawing: a merge going forwards, a split going backwards (^916). */
const joinWord = (f: DrawFacts) => (f.backwards ? 'split' : 'merge');
const finishWord = (f: DrawFacts) => (f.firstNodeOnly ? 'cancel' : 'finish');
const extend = (way: 'forwards' | 'backwards') => (f: DrawFacts) =>
  nodeAct('extend')(f) && f.way === way;

const row = (
  hat: number,
  input: Control<DrawFacts>['input'],
  on: Control<DrawFacts>['on'],
  says: (f: DrawFacts) => string,
): Control<DrawFacts> => ({
  hat,
  input,
  on,
  listens: yes,
  says,
});

/** The controls of draw and extend mode, in the order of the hints (`main`'s `DRAW_HEAD`, `DRAW_TAIL`). */
export const DRAW_CONTROLS: Control<DrawFacts>[] = [
  { ...row(771, key('Tab'), draw, () => 'view mode'), id: 'view' },
  row(412, [lmb, ESC], nodeAct('finish'), () => 'finish'),
  row(436, [lmb, ESC], nodeAct('cancel'), () => 'cancel'),
  row(496, lmb, extend('forwards'), () => 'extend forwards'),
  row(916, lmb, extend('backwards'), () => 'extend backwards'),
  row(915, mouse('lmb', false, 'alt'), extend('forwards'), () => 'extend backwards'),
  row(917, mouse('lmb', false, 'alt'), extend('backwards'), () => 'extend forwards'),
  row(706, lmb, nodeAct('split'), () => 'split'),
  row(714, lmb, nodeAct('merge'), joinWord),
  row(716, lmb, nodeAct('close'), () => 'close'),
  row(410, lmb, onVoid, (f) => (f.extending ? 'place node' : 'place first node')),
  row(
    707,
    lmb,
    (f) => onCurve(f) && !f.extending,
    () => 'split',
  ),
  row(715, lmb, (f) => onCurve(f) && f.extending, joinWord),
  row(411, mouse('lmb', true), onVoid, (f) =>
    f.extending ? 'place node and set heading' : 'place first node and set heading',
  ),
  row(708, mouse('lmb', true), onCurve, () => 'insert and set heading'),
  row(489, rmb, onNode, () => 'delete node'),
  row(709, rmb, onCurve, () => 'delete segment'),
  row(710, mouse('rmb', false, 'alt'), onCurve, () => 'delete branch'),
  row(
    1264,
    key('Del'),
    (f) => draw(f) && f.extending,
    () => 'delete node',
  ),
  row(720, [ESC, rmb], onVoid, finishWord),
  row(
    713,
    ESC,
    (f) => onCurve(f) || (onNode(f) && f.act !== 'finish' && f.act !== 'cancel'),
    finishWord,
  ),
];

/** The hints of draw and extend mode, without those of the controls used lately (`hidden`, ^110). */
export const drawHints = (f: DrawFacts, hidden: (id: NonNullable<Hint['id']>) => boolean): Hint[] =>
  hintsOf(DRAW_CONTROLS, f).filter((h) => !(h.id && hidden(h.id)));

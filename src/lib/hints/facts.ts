import type { HandleType } from '../curves/handles';
import type { Control } from './controls';
import { mouse, type Input } from './inputs';
import type { HintState, HintTarget } from './hints';

/**
 * The controls of the editor and what they say (^783): the pointer controls of select mode and of
 * draw and extend mode by what is under the pointer, the camera, `Tab`, the snap keys, `P`, view
 * mode and the controls while a handle is dragged. `hints.ts` only puts the rows together.
 */
export interface Facts {
  viewing: boolean;
  /** Draw mode or extend mode (a road mode); else select mode. */
  drawing: boolean;
  target: HintTarget;
  /** How many nodes are selected. */
  selected: number;
  state: HintState;
}

export type C = Control<Facts>;
type HandleTarget = Extract<HintTarget, { kind: 'handle' }>;

export const handle = (f: Facts): HandleTarget | null =>
  f.target.kind === 'handle' ? f.target : null;
export const isNode = (f: Facts) => handle(f)?.type === 'node';
export const isType =
  (...types: HandleType[]) =>
  (f: Facts) =>
    types.includes(handle(f)?.type as HandleType);
export const select = (f: Facts) => !f.viewing && !f.drawing;
export const draw = (f: Facts) => !f.viewing && f.drawing;
export const onVoid = (f: Facts) => f.target.kind === 'empty';
export const onCurve = (f: Facts) => f.target.kind === 'curve';
export const lane = (f: Facts) => f.target.kind !== 'empty' && !!f.target.lane;
export const always = () => true;
export const some = (f: Facts) => f.selected > 0;
export const finishWord = (f: Facts) => (f.state.firstNodeOnly ? 'cancel' : 'finish');
export const key = (label: string): Input => ({ kind: 'key', label });
export const lmb = mouse('lmb');
export const rmb = mouse('rmb');
export const act = (f: Facts) => handle(f)?.act ?? null;
export const curveAct = (f: Facts) => (f.target.kind === 'curve' ? f.target.act : null);

/** The node under the pointer in select mode: select, add, branch (^72, ^75, ^128, ^244). */
export const nodeSelected = (f: Facts) => !!handle(f)?.selected;
export const onSelection = (f: Facts) => f.target.kind !== 'empty' && !!f.target.onSelection;
export const picked = (f: Facts) => (f.target.kind === 'curve' ? (f.target.picked ?? 0) : 0);

export const DRAG_TEXT: Record<HandleType, string> = {
  node: 'move node',
  head: 'turn heading',
  ctrl: 'bend curve',
  rad: 'change radius',
};

/** Left drag on a handle: what it does by its kind (^488, ^695, ^696, ^697). */
export const dragRow = (hat: number, ...types: HandleType[]): C => ({
  hat,
  input: mouse('lmb', true),
  on: (f) => !f.viewing && isType(...types)(f),
  listens: always,
  says: (f) => DRAG_TEXT[handle(f)!.type],
});

/** The row for a click on a node in draw mode: what it does is `act` (^23, ^65, ^141, ^278). */
export const actRow = (hat: number, text: string, on: (f: Facts) => boolean): C => ({
  hat,
  input: lmb,
  on,
  listens: always,
  says: () => text,
});

export const nodeAct = (a: string) => (f: Facts) => draw(f) && isNode(f) && act(f) === a;

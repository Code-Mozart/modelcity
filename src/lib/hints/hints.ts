import type { HandleType } from '../curves/handles';
import type { CurveAction, NodeAction } from '../model/junction';
import { keys, type Input } from './inputs';
import { hintsOf, type Control } from './controls';
import { DRAG_CONTROLS, PANEL_CONTROLS, VIEW_CONTROLS } from './areaControls';

export { ENTER, ESC, hint, mouse } from './inputs';
export type { Input } from './inputs';

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

/** Whether the user used a control lately, so that its hint is hidden (^110). */
export type Hidden = (id: ControlId) => boolean;

const visited = (row: Hint, hidden: Hidden) => row.id !== undefined && hidden(row.id);

/** What can be undone or redone right now (^81). */
export interface HistoryState {
  undo: boolean;
  redo: boolean;
}

const BATCH = (text: string) => ({ key: 'Alt', text });

/** Undo and redo, only while there is something to undo or redo (^81); holding Alt does it by batch, which the note says (^103, ^454, ^456). */
export const HISTORY_CONTROLS: Control<HistoryState>[] = [
  {
    hat: 454,
    input: keys('Ctrl', 'Z'),
    id: 'undo',
    note: BATCH('to undo batch'),
    on: (f) => f.undo,
    listens: (f) => f.undo,
    says: () => 'undo',
  },
  {
    hat: 456,
    input: [keys('Ctrl', 'Y'), keys('Ctrl', 'Shift', 'Z')],
    id: 'redo',
    note: BATCH('to redo batch'),
    on: (f) => f.redo,
    listens: (f) => f.redo,
    says: () => 'redo',
  },
];

/** The undo and redo hints, for the recent history panel (^109). */
export function historyHints(state: HistoryState, hidden: Hidden = () => false): Hint[] {
  return hintsOf(HISTORY_CONTROLS, state).filter((r) => !visited(r, hidden));
}

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

/** View mode: only the camera and the way out, which is never hidden: it is the only way (^384). */
export function viewHints(hidden: Hidden = () => false): Hint[] {
  const facts = {
    viewing: true,
    drawing: false,
    target: { kind: 'empty' } as const,
    selected: 0,
    state: {},
  };
  return hintsOf(VIEW_CONTROLS, facts).filter((r) => !visited(r, hidden));
}

/**
 * The hints for the top left corner, for the current mode, what is under the pointer and how many
 * nodes are selected (^49): the rows of the controls that exist there, `Tab` first, `P` last; while
 * a handle is dragged only what matters now (^286).
 */
export function hintsFor(
  drawing: boolean,
  target: HintTarget,
  selected = 0,
  state: HintState = {},
): Hint[] {
  const facts = { viewing: false, drawing, target, selected, state };
  if (state.drag) return hintsOf(DRAG_CONTROLS, facts);
  const hidden = state.hidden ?? (() => false);
  return hintsOf(PANEL_CONTROLS, facts).filter((r) => !visited(r, hidden));
}

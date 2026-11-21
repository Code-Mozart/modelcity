import { hintsOf, type Control } from './controls';
import type { Hint } from './hints';
import { keys } from './inputs';

/** What can be undone or redone right now (^81). */
export interface HistoryState {
  undo: boolean;
  redo: boolean;
  /** The last step to undo, or the next to redo, is part of a batch of more than one step: `Alt` does more than a step (^418). */
  undoBatch?: boolean;
  redoBatch?: boolean;
}

const BATCH = (text: string) => ({ key: 'Alt', text });

/** Undo and redo, only while there is something to undo or redo (^81); holding Alt does it by batch, which the note says (^103, ^454, ^456). */
export const HISTORY_CONTROLS: Control<HistoryState>[] = [
  {
    hat: 454,
    input: keys('Ctrl', 'Z'),
    id: 'undo',
    note: (f) => (f.undoBatch ? BATCH('to undo batch') : null),
    on: (f) => f.undo,
    listens: (f) => f.undo,
    says: () => 'undo',
  },
  {
    hat: 456,
    input: [keys('Ctrl', 'Y'), keys('Ctrl', 'Shift', 'Z')],
    id: 'redo',
    note: (f) => (f.redoBatch ? BATCH('to redo batch') : null),
    on: (f) => f.redo,
    listens: (f) => f.redo,
    says: () => 'redo',
  },
];

/** The undo and redo hints, for the recent history panel (^109). */
export const historyHints = (
  state: HistoryState,
  hidden: (id: NonNullable<Hint['id']>) => boolean = () => false,
): Hint[] => hintsOf(HISTORY_CONTROLS, state).filter((h) => !(h.id && hidden(h.id)));

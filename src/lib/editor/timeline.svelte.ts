import { NO_HISTORY, redoStep, undoStep, type HistoryEvent, type Step } from './history';
import { takeStep as take } from './stepNames';
import type { Snapshot } from './types';

export type Move = 'undo' | 'redo' | 'undoBatch' | 'redoBatch';

/** The steps that can be undone and redone (^81, ^103), and the last thing that happened to them, for the recent history panel (^107). */
export class Timeline {
  history = $state.raw(NO_HISTORY);
  event = $state.raw<HistoryEvent | null>(null);
  private count = 0;
  canUndo = $derived(this.history.past.length > 0);
  canRedo = $derived(this.history.future.length > 0);

  /** Forget everything: another project was opened. */
  clear() {
    this.history = NO_HISTORY;
    this.event = null;
  }

  /** The step from `before` to `after`, named; `take` is the rule for which steps join (^218). */
  record(before: Snapshot, after: Snapshot, name: string) {
    const r = take(this.history, before, after, name);
    this.history = r.history;
    this.announce('step', [r.step]);
  }

  /** Undo or redo a step or a whole batch; the state to show, or null if there is nothing to do. */
  go(action: Move): Snapshot | null {
    const go = action.startsWith('undo') ? undoStep : redoStep;
    const r = go(this.history, action.endsWith('Batch'));
    if (!r) return null;
    this.history = r.history;
    this.announce(action.slice(0, 4) as 'undo' | 'redo', r.steps);
    return r.to;
  }

  private announce(kind: HistoryEvent['kind'], steps: Step[]) {
    this.event = { seq: ++this.count, kind, steps };
  }
}

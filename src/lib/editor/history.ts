import type { RowChange } from '../edit/change';
import type { DrawState } from './drawing';
import type { SelectionDelta } from './selection';

/**
 * Undo and redo (^81, ^103): the steps taken, oldest first, and the steps undone. Pure: every
 * function returns the new history.
 *
 * A *batch* (^216) is a run of consecutive steps of one kind: selection changes, or the steps of
 * one drawing session. `Ctrl+Z` moves one step, `Alt+Ctrl+Z` a whole batch.
 *
 * A step holds what it changed, not the state before and after (^1257): a selection of 100,000
 * nodes in each of 200 steps would be 20 million ids. What it changed is enough to go both ways,
 * and the changes of the map will be the same kind of thing (a `MapChange` that can be reversed).
 */
export type StepKind = 'select' | 'draw' | null;

export interface Step {
  /** What the step did, lower case (^216): `move node`, `select 3 nodes`. */
  name: string;
  kind: StepKind;
  /** Steps of one batch share the number. */
  batch: number;
  selection: SelectionDelta;
  /** How many nodes are selected after the step: a run of selection steps that ends with none is named `deselect all` (^216). */
  selectedAfter: number;
  /** What the step changed on the map, if it did (^1260): the rows as they were and are, so that undo and redo can write them again. */
  map?: RowChange;
  /** The road being drawn before and after the step, if it was drawn before or after it (^1262): undo and redo go back to drawing it. */
  draw?: { before: DrawState; after: DrawState };
}

export interface History {
  past: Step[];
  future: Step[];
  /** An undo or redo happened since the last step: the next step starts a batch of its own. */
  sealed: boolean;
  nextBatch: number;
}

export const NO_HISTORY: History = { past: [], future: [], sealed: false, nextBatch: 0 };

/** The most steps that are kept. */
export const MAX_STEPS = 200;

/** A step that was just taken; `continues` says it may join the batch of the step before. */
export type NewStep = Omit<Step, 'batch'> & { continues: boolean };

/** The steps of the batch at the end of the list, in the order of the list. */
function lastBatch(steps: Step[]): Step[] {
  const batch = steps.at(-1)?.batch;
  let from = steps.length;
  while (from > 0 && steps[from - 1]!.batch === batch) from--;
  return steps.slice(from);
}

/** How many steps `Alt` would undo and redo at once: the batch at the end of the past and of the future (^418). */
export const batchSizes = (h: History) => ({
  undo: lastBatch(h.past).length,
  redo: lastBatch(h.future).length,
});

/** A new step was taken; what was undone can no longer be redone. */
export function record(h: History, { continues, ...step }: NewStep): History {
  const last = h.past.at(-1);
  const joins = continues && !h.sealed && step.kind !== null && last?.kind === step.kind;
  const taken: Step = { ...step, batch: joins ? last!.batch : h.nextBatch };
  return {
    past: [...h.past, taken].slice(-MAX_STEPS),
    future: [],
    sealed: false,
    nextBatch: joins ? h.nextBatch : h.nextBatch + 1,
  };
}

/** What an undo or redo did: the new history and the steps that moved, in the order they are to be applied. */
export interface Moved {
  history: History;
  steps: Step[];
}

/** Go back one step, or a whole batch: the steps come newest first, each to be undone. */
export function undoStep(h: History, whole = false): Moved | null {
  const steps = whole ? lastBatch(h.past) : h.past.slice(-1);
  if (!steps.length) return null;
  const history = {
    ...h,
    past: h.past.slice(0, h.past.length - steps.length),
    future: [...h.future, ...[...steps].reverse()],
    sealed: true,
  };
  return { history, steps: [...steps].reverse() };
}

/** Go forward again, one step or a whole batch: the steps come oldest first, each to be done again. */
export function redoStep(h: History, whole = false): Moved | null {
  const taken = whole ? lastBatch(h.future) : h.future.slice(-1);
  if (!taken.length) return null;
  const steps = [...taken].reverse();
  const history = {
    ...h,
    past: [...h.past, ...steps],
    future: h.future.slice(0, h.future.length - taken.length),
    sealed: true,
  };
  return { history, steps };
}

/** Something happened to the history: a step was taken, undone or redone (^107). */
export interface HistoryEvent {
  seq: number;
  kind: 'step' | 'undo' | 'redo';
  steps: Step[];
}

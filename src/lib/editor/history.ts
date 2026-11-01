import type { Snapshot } from './types';

/**
 * Undo and redo (^81, ^103): the steps taken, oldest first, and the steps undone. Pure: every
 * function returns the new history.
 *
 * A *batch* (^216) is a run of consecutive steps of one kind: selection changes, or the steps of
 * one drawing session. `Ctrl+Z` moves one step, `Alt+Ctrl+Z` a whole batch.
 */
export type StepKind = 'select' | 'draw' | null;

export interface Step {
  /** What the step did, lower case (^216): `move node`, `select 3 nodes`. */
  name: string;
  kind: StepKind;
  /** Steps of one batch share the number. */
  batch: number;
  before: Snapshot;
  after: Snapshot;
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

/** How many steps the batch at the end of the list has. */
export const batchSize = (steps: Step[]) => lastBatch(steps).length;

/** A new step was taken; what was undone can no longer be redone. */
export function record(
  h: History,
  { continues, ...step }: NewStep,
): { history: History; step: Step } {
  const last = h.past.at(-1);
  const joins = continues && !h.sealed && step.kind !== null && last?.kind === step.kind;
  const batch = joins ? last!.batch : h.nextBatch;
  const taken: Step = { ...step, batch };
  const history = {
    past: [...h.past, taken].slice(-MAX_STEPS),
    future: [],
    sealed: false,
    nextBatch: joins ? h.nextBatch : h.nextBatch + 1,
  };
  return { history, step: taken };
}

/** What an undo or redo did: the state to show, the new history and the steps that moved. */
export interface Moved {
  to: Snapshot;
  history: History;
  steps: Step[];
}

/** Go back one step, or a whole batch. */
export function undoStep(h: History, whole = false): Moved | null {
  const steps = whole ? lastBatch(h.past) : h.past.slice(-1);
  if (!steps.length) return null;
  const history = {
    ...h,
    past: h.past.slice(0, h.past.length - steps.length),
    future: [...h.future, ...[...steps].reverse()],
    sealed: true,
  };
  return { to: steps[0]!.before, history, steps };
}

/** Go forward again, one step or a whole batch. */
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
  return { to: steps.at(-1)!.after, history, steps };
}

/** Something happened to the history: a step was taken, undone or redone (`open`: its batch may go on, ^108). */
export interface HistoryEvent {
  seq: number;
  kind: 'step' | 'undo' | 'redo';
  steps: Step[];
  open: boolean;
}

import type { Snapshot } from './editorTypes';

/**
 * Undo and redo (^81): the states before each step, oldest first, and the states undone. Pure:
 * every function returns the new history.
 */
export interface History {
  past: Snapshot[];
  future: Snapshot[];
}

export const NO_HISTORY: History = { past: [], future: [] };

/** The most steps that are kept. */
export const MAX_STEPS = 200;

/** A new step was taken from `before`; what was undone can no longer be redone. */
export const record = (h: History, before: Snapshot): History => ({
  past: [...h.past, before].slice(-MAX_STEPS),
  future: [],
});

/** Go one step back from `current`: the state to show and the new history, or null. */
export function undoStep(h: History, current: Snapshot) {
  const to = h.past.at(-1);
  if (!to) return null;
  return { to, history: { past: h.past.slice(0, -1), future: [...h.future, current] } };
}

/** Go one step forward again. */
export function redoStep(h: History, current: Snapshot) {
  const to = h.future.at(-1);
  if (!to) return null;
  return { to, history: { past: [...h.past, current], future: h.future.slice(0, -1) } };
}

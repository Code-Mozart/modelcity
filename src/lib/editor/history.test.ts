import { describe, expect, it } from 'vitest';
import {
  batchSizes,
  MAX_STEPS,
  NO_HISTORY,
  record,
  redoStep,
  undoStep,
  type History,
  type NewStep,
} from './history';
import {
  applyDelta,
  deltaOf,
  NOTHING,
  sameSelection,
  selectionName,
  type Selection,
} from './selection';

const pick = (...ids: number[]): Selection => new Set(ids);

/** The history after a step from one selection to another: it is a selection step, and continues a batch. */
function take(h: History, before: Selection, after: Selection, extra: Partial<NewStep> = {}) {
  return record(h, {
    name: selectionName(before, after),
    kind: 'select',
    continues: true,
    selection: deltaOf(before, after),
    selectedAfter: after.size,
    ...extra,
  });
}

/** The selection after steps are undone (newest first) or done again. */
const through = (
  sel: Selection,
  steps: { selection: ReturnType<typeof deltaOf> }[],
  undo: boolean,
) => steps.reduce((s, step) => applyDelta(s, step.selection, undo), sel);

describe('the history (^81, ^103, ^216)', () => {
  it('goes back one step and forward again', () => {
    let h = take(NO_HISTORY, NOTHING, pick(1));
    h = take(h, pick(1), pick(1, 2));
    const back = undoStep(h)!;
    expect(back.steps.map((s) => s.name)).toEqual(['select node']);
    expect(through(pick(1, 2), back.steps, true)).toEqual(pick(1));
    const again = redoStep(back.history)!;
    expect(through(pick(1), again.steps, false)).toEqual(pick(1, 2));
    expect(redoStep(again.history)).toBeNull();
    expect(undoStep(NO_HISTORY)).toBeNull();
  });

  it('puts the steps of a run of selections in one batch, which Alt moves at once', () => {
    let h = take(NO_HISTORY, NOTHING, pick(1));
    h = take(h, pick(1), pick(1, 2));
    h = take(h, pick(1, 2), pick(1, 2, 3));
    expect(batchSizes(h)).toEqual({ undo: 3, redo: 0 });
    const back = undoStep(h, true)!;
    expect(back.steps).toHaveLength(3);
    expect(through(pick(1, 2, 3), back.steps, true).size).toBe(0);
    expect(batchSizes(back.history)).toEqual({ undo: 0, redo: 3 });
    const forth = redoStep(back.history, true)!;
    expect(through(NOTHING, forth.steps, false)).toEqual(pick(1, 2, 3));
  });
});

describe('the batches of the history (^216)', () => {
  it('starts a batch of its own after an undo, and a step of another kind does not join', () => {
    let h = take(NO_HISTORY, NOTHING, pick(1));
    h = undoStep(h)!.history;
    h = take(h, NOTHING, pick(2));
    h = take(h, pick(2), pick(2, 3));
    expect(batchSizes(h).undo).toBe(2);
    h = take(h, pick(2, 3), pick(2, 3), { kind: null, name: 'move node', continues: false });
    h = take(h, pick(2, 3), NOTHING);
    expect(batchSizes(h).undo).toBe(1);
  });

  it('forgets what was undone when a new step is taken, and keeps the last MAX_STEPS', () => {
    let h = take(NO_HISTORY, NOTHING, pick(1));
    h = undoStep(h)!.history;
    h = take(h, NOTHING, pick(2));
    expect(h.future).toEqual([]);
    for (let i = 0; i < MAX_STEPS + 10; i++) h = take(h, pick(i), pick(i + 1));
    expect(h.past).toHaveLength(MAX_STEPS);
  });
});

/** A run of random selection steps: the history and the selection at its end. */
function randomRun(rand: (n: number) => number) {
  let h: History = NO_HISTORY;
  let sel: Selection = NOTHING;
  for (let i = 0; i < 1 + rand(20); i++) {
    const next = new Set(Array.from({ length: rand(5) }, () => rand(8)));
    h = take(h, sel, next, { continues: rand(2) === 0 });
    sel = next;
  }
  return { h, sel };
}

/** Undo (or redo) until nothing is left, one step or a batch at a time as the dice say. */
function walk(
  start: { h: History; sel: Selection },
  move: typeof undoStep,
  undo: boolean,
  rand: (n: number) => number,
) {
  let { h, sel } = start;
  for (let m = move(h, rand(2) === 0); m; m = move(h, rand(2) === 0)) {
    sel = through(sel, m.steps, undo);
    h = m.history;
  }
  return { h, sel };
}

describe('the history of any run of selections (^216)', () => {
  it('undoing all of it gives the start, and doing it again the end (random runs)', () => {
    let seed = 7;
    const rand = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
    for (let run = 0; run < 50; run++) {
      const made = randomRun(rand);
      const back = walk(made, undoStep, true, rand);
      expect(sameSelection(back.sel, NOTHING)).toBe(true);
      expect(sameSelection(walk(back, redoStep, false, rand).sel, made.sel)).toBe(true);
    }
  });
});

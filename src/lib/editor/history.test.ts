import { describe, expect, it } from 'vitest';
import type { Snapshot } from './types';
import { emptyGraph } from '../model/graph';
import {
  MAX_STEPS,
  NO_HISTORY,
  batchSize,
  record,
  redoStep,
  undoStep,
  type History,
  type StepKind,
} from './history';

const snap = (n: number): Snapshot => ({
  graph: emptyGraph(),
  active: n,
  end: 'end',
  origin: null,
  selection: [],
});

/** Take a step from state `n` to `n + 1`. */
const take = (h: History, n: number, kind: StepKind = null, continues = true): History =>
  record(h, { name: `step ${n}`, kind, before: snap(n), after: snap(n + 1), continues }).history;

describe('history (^81)', () => {
  it('undoes and redoes steps in order', () => {
    const h = take(take(NO_HISTORY, 1), 2);
    const u1 = undoStep(h)!;
    expect(u1.to.active).toBe(2);
    const u2 = undoStep(u1.history)!;
    expect(u2.to.active).toBe(1);
    expect(undoStep(u2.history)).toBeNull();
    const r = redoStep(u2.history)!;
    expect(r.to.active).toBe(2);
    expect(r.history.past.map((s) => s.name)).toEqual(['step 1']);
  });

  it('a new step clears what could be redone', () => {
    const u = undoStep(take(NO_HISTORY, 1))!;
    expect(u.history.future).toHaveLength(1);
    expect(take(u.history, 5).future).toEqual([]);
  });

  it('keeps a limited number of steps', () => {
    let h = NO_HISTORY;
    for (let i = 0; i < MAX_STEPS + 10; i++) h = take(h, i);
    expect(h.past).toHaveLength(MAX_STEPS);
    expect(h.past[0]!.before.active).toBe(10);
  });
});

describe('batches (^103, ^216)', () => {
  const selects = (n: number) => {
    let h = NO_HISTORY;
    for (let i = 0; i < n; i++) h = take(h, i, 'select');
    return h;
  };

  it('consecutive steps of one kind are one batch; other steps and kinds are not', () => {
    expect(batchSize(selects(3).past)).toBe(3);
    expect(batchSize(take(selects(3), 3, null).past)).toBe(1);
    expect(batchSize(take(selects(3), 3, 'draw').past)).toBe(1);
    expect(batchSize(take(selects(3), 3, 'select', false).past)).toBe(1);
  });

  it('a whole batch is undone and redone at once, a single step one by one', () => {
    const h = selects(3);
    const u = undoStep(h, true)!;
    expect(u.steps).toHaveLength(3);
    expect(u.to.active).toBe(0);
    expect(u.history.past).toEqual([]);
    const r = redoStep(u.history, true)!;
    expect(r.steps.map((s) => s.name)).toEqual(['step 0', 'step 1', 'step 2']);
    expect(r.to.active).toBe(3);
    const one = undoStep(h)!;
    expect(one.steps.map((s) => s.name)).toEqual(['step 2']);
    expect(redoStep(one.history)!.to.active).toBe(3);
    expect(batchSize(one.history.future)).toBe(1);
  });

  it('a step after an undo starts a batch of its own', () => {
    const u = undoStep(selects(2))!;
    const h = take(u.history, 1, 'select');
    expect(batchSize(h.past)).toBe(1);
  });
});

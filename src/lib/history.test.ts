import { describe, expect, it } from 'vitest';
import type { Snapshot } from './editorTypes';
import { MAX_STEPS, NO_HISTORY, record, redoStep, undoStep } from './history';

const snap = (n: number): Snapshot => ({ roads: [], active: n, end: 'end', selection: [] });

describe('history (^81)', () => {
  it('undoes and redoes steps in order', () => {
    const h = record(record(NO_HISTORY, snap(1)), snap(2));
    const u1 = undoStep(h, snap(3))!;
    expect(u1.to.active).toBe(2);
    const u2 = undoStep(u1.history, snap(2))!;
    expect(u2.to.active).toBe(1);
    expect(undoStep(u2.history, snap(1))).toBeNull();
    const r = redoStep(u2.history, snap(1))!;
    expect(r.to.active).toBe(2);
    expect(r.history.past.map((s) => s.active)).toEqual([1]);
  });

  it('a new step clears what could be redone', () => {
    const u = undoStep(record(NO_HISTORY, snap(1)), snap(2))!;
    expect(u.history.future).toHaveLength(1);
    expect(record(u.history, snap(5)).future).toEqual([]);
  });

  it('keeps a limited number of steps', () => {
    let h = NO_HISTORY;
    for (let i = 0; i < MAX_STEPS + 10; i++) h = record(h, snap(i));
    expect(h.past).toHaveLength(MAX_STEPS);
    expect(h.past[0]!.active).toBe(10);
  });
});

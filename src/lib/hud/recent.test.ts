import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyGraph } from '../model/graph';
import type { HistoryEvent, Step } from '../editor/history';
import { RECENT_MS, Recent } from './recent.svelte';

const snap = (selection: number[] = []) => ({
  graph: emptyGraph(),
  active: null,
  end: 'end' as const,
  origin: null,
  selection,
});
const step = (name: string, batch: number): Step => ({
  name,
  kind: 'select',
  batch,
  before: snap(),
  after: snap([1]),
});
let seq = 0;
const stepped = (s: Step, open = true): HistoryEvent => ({
  seq: ++seq,
  kind: 'step',
  steps: [s],
  open,
});
const texts = (r: Recent) => r.items.map((i) => i.prefix + i.steps.map((s) => s.name).join('+'));

describe('the recent history panel (^107, ^108)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a single step goes after the interval, each item on its own', () => {
    const r = new Recent();
    r.consume(stepped(step('move node', 1), false));
    vi.advanceTimersByTime(RECENT_MS - 1000);
    r.consume(stepped(step('delete node', 2), false));
    vi.advanceTimersByTime(1000);
    expect(texts(r)).toEqual(['delete node']);
    vi.advanceTimersByTime(RECENT_MS);
    expect(r.items).toEqual([]);
  });

  it('steps of one batch are one item, which stays while the batch is open', () => {
    const r = new Recent();
    r.consume(stepped(step('select node', 1)));
    r.consume(stepped(step('select node', 1)));
    vi.advanceTimersByTime(RECENT_MS * 10);
    expect(texts(r)).toEqual(['select node+select node']);
  });

  it('a step of another batch finishes the open one, which then goes after the interval', () => {
    const r = new Recent();
    r.consume(stepped(step('select node', 1)));
    r.consume(stepped(step('select node', 1)));
    r.consume(stepped(step('delete node', 2), false));
    expect(texts(r)).toHaveLength(2);
    vi.advanceTimersByTime(RECENT_MS);
    expect(r.items).toEqual([]);
  });
});

describe('undo and redo in the recent history panel (^107)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('an undo or redo is an item with its prefix and closes open batches', () => {
    const r = new Recent();
    r.consume(stepped(step('select node', 1)));
    r.consume(stepped(step('select node', 1)));
    r.consume({ seq: ++seq, kind: 'redo', steps: [step('move node', 3)], open: false });
    expect(texts(r)).toEqual(['select node+select node', 'redo: move node']);
    vi.advanceTimersByTime(RECENT_MS);
    expect(r.items).toEqual([]);
  });

  it('forgets everything when the history is cleared (another project)', () => {
    const r = new Recent();
    r.consume(stepped(step('move node', 1), false));
    r.consume(null);
    expect(r.items).toEqual([]);
  });
});

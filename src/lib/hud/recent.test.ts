import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HistoryEvent } from '../editor/history';
import { RECENT_MS, Recent } from './recent.svelte';

let seq = 0;
const event = (kind: HistoryEvent['kind'] = 'step'): HistoryEvent => ({
  seq: ++seq,
  kind,
  steps: [],
});

describe('when the recent history panel is shown (^107)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('comes with the first step and goes after the interval without another', () => {
    const r = new Recent();
    expect(r.visible).toBe(false);
    r.consume(event());
    expect(r.visible).toBe(true);
    vi.advanceTimersByTime(RECENT_MS - 1);
    expect(r.visible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(r.visible).toBe(false);
  });

  it('every step, undo and redo counts as an operation and starts the interval again', () => {
    const r = new Recent();
    r.consume(event());
    vi.advanceTimersByTime(RECENT_MS - 100);
    r.consume(event('undo'));
    vi.advanceTimersByTime(RECENT_MS - 100);
    expect(r.visible).toBe(true);
    r.consume(event('redo'));
    vi.advanceTimersByTime(RECENT_MS);
    expect(r.visible).toBe(false);
    r.consume(event());
    expect(r.visible).toBe(true);
  });

  it('is gone when the history is cleared (another project)', () => {
    const r = new Recent();
    r.consume(event());
    r.consume(null);
    expect(r.visible).toBe(false);
  });
});

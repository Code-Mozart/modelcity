import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_LONG_MS, TOAST_MS, Toasts } from './toasts.svelte';

describe('toasts (^232)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('go by themselves, warnings and errors later', () => {
    const t = new Toasts();
    t.show('success', 'saved');
    t.show('error', 'broken');
    vi.advanceTimersByTime(TOAST_MS + 1);
    expect(t.items.map((i) => i.text)).toEqual(['broken']);
    vi.advanceTimersByTime(TOAST_LONG_MS);
    expect(t.items).toEqual([]);
  });

  it('a message that is showing is not shown twice: its time starts again (^242)', () => {
    const t = new Toasts();
    t.show('info', 'nothing to undo');
    vi.advanceTimersByTime(TOAST_MS - 500);
    t.show('info', 'nothing to undo');
    t.show('info', 'nothing to undo');
    expect(t.items).toHaveLength(1);
    vi.advanceTimersByTime(TOAST_MS - 500);
    expect(t.items).toHaveLength(1);
    vi.advanceTimersByTime(600);
    expect(t.items).toEqual([]);
  });

  it('other messages, and the same text of another kind, are shown next to it', () => {
    const t = new Toasts();
    t.show('info', 'saved');
    t.show('success', 'saved');
    t.show('info', 'modelcity saves automatically');
    expect(t.items).toHaveLength(3);
  });
});

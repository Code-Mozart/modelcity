import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEARNED_MS, Usage } from './usage.svelte';

describe('learned controls (^110)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no control is learned at the start; a used one is hidden, each on its own', () => {
    const u = new Usage();
    expect(u.hidden('pan')).toBe(false);
    u.mark('pan');
    expect(u.hidden('pan')).toBe(true);
    expect(u.hidden('zoom')).toBe(false);
  });

  it('the hint comes back after the interval without using the control', () => {
    const u = new Usage();
    u.mark('pan');
    vi.advanceTimersByTime(LEARNED_MS - 1000);
    expect(u.hidden('pan')).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(u.hidden('pan')).toBe(false);
  });

  it('using it again starts the interval again', () => {
    const u = new Usage();
    u.mark('zoom');
    vi.advanceTimersByTime(LEARNED_MS - 1000);
    u.mark('zoom');
    vi.advanceTimersByTime(LEARNED_MS - 1000);
    expect(u.hidden('zoom')).toBe(true);
  });
});

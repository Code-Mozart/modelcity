import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DWELL_MS, Dwell, TIP_EVERY_MS } from './dwell';

describe('following a snap suggestion for a while (^258)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = () => {
    const tip = vi.fn();
    return { tip, dwell: new Dwell(tip, () => Date.now()) };
  };

  it('says how to pin once the same suggestion has been followed long enough', () => {
    const { tip, dwell } = make();
    dwell.follow('a');
    vi.advanceTimersByTime(DWELL_MS - 1);
    expect(tip).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(tip).toHaveBeenCalledTimes(1);
  });

  it('starts again when the suggestion changes or is left', () => {
    const { tip, dwell } = make();
    dwell.follow('a');
    vi.advanceTimersByTime(DWELL_MS - 1);
    dwell.follow('b');
    vi.advanceTimersByTime(DWELL_MS - 1);
    dwell.follow(null);
    vi.advanceTimersByTime(DWELL_MS * 2);
    expect(tip).not.toHaveBeenCalled();
  });

  it('at most once a minute', () => {
    const { tip, dwell } = make();
    dwell.follow('a');
    vi.advanceTimersByTime(DWELL_MS);
    dwell.follow(null);
    dwell.follow('b');
    vi.advanceTimersByTime(DWELL_MS);
    expect(tip).toHaveBeenCalledTimes(1);
    dwell.follow(null);
    vi.advanceTimersByTime(TIP_EVERY_MS);
    dwell.follow('c');
    vi.advanceTimersByTime(DWELL_MS);
    expect(tip).toHaveBeenCalledTimes(2);
  });
});

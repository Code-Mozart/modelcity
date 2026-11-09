import { describe, expect, it } from 'vitest';
import { DebugTools, WALK_SPEED_M_S, isWalkKey } from './debugTools.svelte';

describe('the dots walk while , or . is held, in the debug layer (^948)', () => {
  const k = (key: string, extra = {}) => ({
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...extra,
  });

  it('the keys are , and . with no modifier', () => {
    expect(isWalkKey(k('.'))).toBe(true);
    expect(isWalkKey(k(','))).toBe(true);
    expect(isWalkKey(k('.', { ctrlKey: true }))).toBe(false);
    expect(isWalkKey(k('a'))).toBe(false);
  });
});

describe('the walk of the dots (^948)', () => {
  it('they do nothing while the debug layer is off', () => {
    const debug = new DebugTools();
    expect(debug.holdWalk('.', true)).toBe(false);
    expect(debug.walking).toBe(0);
  });

  it('. goes forward, , back, both stand still, release stops', () => {
    const debug = new DebugTools();
    debug.toggleCoordinates();
    debug.holdWalk('.', true);
    debug.step(1);
    expect(debug.walk).toBe(WALK_SPEED_M_S);
    debug.holdWalk(',', true);
    expect(debug.walking).toBe(0);
    debug.holdWalk('.', false);
    debug.step(2);
    expect(debug.walk).toBe(WALK_SPEED_M_S - 2 * WALK_SPEED_M_S);
    debug.holdWalk(',', false);
    expect(debug.walking).toBe(0);
  });

  it('switching the layer off stops a walk that is held', () => {
    const debug = new DebugTools();
    debug.toggleCoordinates();
    debug.holdWalk('.', true);
    debug.toggleCoordinates();
    expect(debug.walking).toBe(0);
  });
});

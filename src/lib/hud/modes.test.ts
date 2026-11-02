import { describe, expect, it } from 'vitest';
import { LABEL_MS, MODES } from './modes';

describe('mode labels (^119)', () => {
  it('each mode has a lower case name and its own color', () => {
    expect(Object.values(MODES).map((m) => m.label)).toEqual([
      'select mode',
      'draw mode',
      'extend mode',
    ]);
    expect(new Set(Object.values(MODES).map((m) => m.color)).size).toBe(3);
    expect(LABEL_MS).toBeLessThan(1000);
  });
});

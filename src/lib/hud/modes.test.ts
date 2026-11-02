import { describe, expect, it } from 'vitest';
import { MODES } from './modes';

describe('mode labels (^119)', () => {
  it('each mode has a lower case name and its own color', () => {
    expect(Object.values(MODES).map((m) => m.label)).toEqual([
      'select mode',
      'draw mode',
      'extend mode',
      'view mode',
    ]);
    expect(new Set(Object.values(MODES).map((m) => m.color)).size).toBe(3);
  });
});

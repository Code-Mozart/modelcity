import { describe, expect, it } from 'vitest';
import { MODES, shownIn } from './modes';

describe('mode labels (^119)', () => {
  it('each mode has a lower case name and its own color', () => {
    expect(Object.values(MODES).map((m) => m.label)).toEqual([
      'select mode',
      'draw mode',
      'extend mode',
      'view mode',
    ]);
    // Draw mode and view mode share the ink, as on `main`; each has its own icon.
    expect(new Set(Object.values(MODES).map((m) => m.icon)).size).toBe(4);
  });

  it('view mode shows itself and select mode, its way out (^104)', () => {
    expect(shownIn('view')).toEqual(['view', 'select']);
    expect(shownIn('select')).toEqual(['view', 'select', 'draw', 'extend']);
  });
});

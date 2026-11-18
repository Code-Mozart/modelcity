import { describe, expect, it } from 'vitest';
import { MODES, shownIn } from './modes';

describe('mode labels (^119)', () => {
  it('each mode has a lower case name and its own color', () => {
    expect(Object.values(MODES).map((m) => m.label)).toEqual(['select mode', 'view mode']);
    expect(new Set(Object.values(MODES).map((m) => m.color)).size).toBe(2);
  });

  it('view mode shows itself and select mode, its way out (^104)', () => {
    expect(shownIn('view')).toEqual(['view', 'select']);
    expect(shownIn('select')).toEqual(['view', 'select']);
  });
});

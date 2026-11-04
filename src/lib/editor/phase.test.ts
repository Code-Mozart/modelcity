import { describe, expect, it } from 'vitest';
import { scaffoldHidden } from './phase';

const none = { movingGroup: false, ctrl: false, dropping: false };

describe('when the scaffold gizmos are hidden (^362)', () => {
  it('always in extend mode', () => {
    expect(scaffoldHidden({ ...none, phase: 'extend' })).toBe(true);
  });
  it('not in select or draw mode, unless a group moves, Ctrl is held or a drop merges', () => {
    for (const phase of ['select', 'draw'] as const) {
      expect(scaffoldHidden({ ...none, phase })).toBe(false);
      expect(scaffoldHidden({ ...none, phase, movingGroup: true })).toBe(true);
      expect(scaffoldHidden({ ...none, phase, ctrl: true })).toBe(true);
      expect(scaffoldHidden({ ...none, phase, dropping: true })).toBe(true);
    }
  });
});

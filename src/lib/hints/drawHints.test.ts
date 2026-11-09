import { describe, expect, it } from 'vitest';
import { show } from '../testing/hintHelpers';
import { hintsFor, type HintTarget } from './hints';

describe('reaching a node or curve says what it does (^916)', () => {
  const state = (backwards: boolean) => ({ backwards, extending: true });
  const text = (target: HintTarget, backwards: boolean) =>
    hintsFor(true, target, 0, state(backwards))
      .map(show)
      .filter((r) => r.startsWith('LMB: '));

  it('a merge going forwards, a split going backwards', () => {
    const merge: HintTarget = { kind: 'handle', type: 'node', act: 'merge' };
    expect(text(merge, false)).toEqual(['LMB: merge']);
    expect(text(merge, true)).toEqual(['LMB: split']);
    expect(text({ kind: 'curve', act: 'merge' }, true)).toEqual(['LMB: split']);
  });
});

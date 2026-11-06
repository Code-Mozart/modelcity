import { describe, expect, it } from 'vitest';
import { snapHintState } from './hintState';
import type { SnapHit } from '../snap/types';

const hit = (curve: object): SnapHit =>
  ({ pt: { x: 0, y: 0 }, heading: null, by: [{ kind: 'curve', ...curve }] }) as unknown as SnapHit;

describe('what the hints know about the snap (^481, ^473)', () => {
  it('nothing snapped: nothing', () => {
    expect(snapHintState({ drawing: true, snapped: null, press: null })).toEqual({
      snapping: false,
      touching: false,
      placing: false,
    });
  });

  it('a snap line that gives a heading: `Shift` and `Alt` have something to do', () => {
    const snapped = hit({ rule: 'normal', straight: true, heading: 1 });
    const s = snapHintState({ drawing: true, snapped, press: null });
    expect([s.snapping, s.touching, s.placing]).toEqual([true, true, true]);
  });

  it('an extend line carries no heading: `Shift` has nothing to drop (^473)', () => {
    const snapped = hit({ rule: 'extend', straight: true });
    const s = snapHintState({ drawing: true, snapped, press: null });
    expect([s.snapping, s.touching, s.placing]).toEqual([true, false, false]);
  });

  it('a snap with a heading in select mode is not a placement', () => {
    const snapped = hit({ rule: 'normal', straight: true, heading: 1 });
    expect(snapHintState({ drawing: false, snapped, press: null }).placing).toBe(false);
  });
});

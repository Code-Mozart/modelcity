import { describe, expect, it } from 'vitest';
import { emptyGraph } from '../model/graph';
import { hintStateOf } from './hintState';
import type { SnapHit } from '../snap/types';

const hit = (curve: object): SnapHit =>
  ({ pt: { x: 0, y: 0 }, heading: null, by: [{ kind: 'curve', ...curve }] }) as unknown as SnapHit;

const base = { drawing: true, press: null, graph: emptyGraph(), active: null };

describe('what the hints know about the snap (^481, ^473)', () => {
  it('nothing snapped: nothing', () => {
    expect(hintStateOf({ ...base, snapped: null })).toEqual({
      snapping: false,
      touching: false,
      placing: false,
      firstNodeOnly: false,
    });
  });

  it('a snap line that gives a heading: `Shift` and `Alt` have something to do', () => {
    const snapped = hit({ rule: 'normal', straight: true, heading: 1 });
    const s = hintStateOf({ ...base, snapped });
    expect([s.snapping, s.touching, s.placing]).toEqual([true, true, true]);
  });

  it('an extend line carries no heading: `Shift` has nothing to drop (^473)', () => {
    const snapped = hit({ rule: 'extend', straight: true });
    const s = hintStateOf({ ...base, snapped });
    expect([s.snapping, s.touching, s.placing]).toEqual([true, false, false]);
  });

  it('a snap with a heading in select mode is not a placement', () => {
    const snapped = hit({ rule: 'normal', straight: true, heading: 1 });
    expect(hintStateOf({ ...base, drawing: false, snapped }).placing).toBe(false);
  });
});

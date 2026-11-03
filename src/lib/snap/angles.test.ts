import { describe, expect, it } from 'vitest';
import { toRad } from '../curves/vec';
import { angleStepAt, snapAngle } from './angles';

describe('the angle snap (^251)', () => {
  it('the step gets finer with the distance: 45, 15, 5, 1 degrees', () => {
    const steps = [10, 100, 200, 400].map((px) => angleStepAt(px) / toRad(1));
    expect(steps.map((s) => Math.round(s))).toEqual([45, 15, 5, 1]);
  });
  it('snaps to absolute multiples of the step', () => {
    expect(snapAngle(toRad(33), 10)).toBeCloseTo(toRad(45));
    expect(snapAngle(toRad(33), 100)).toBeCloseTo(toRad(30));
    expect(snapAngle(toRad(33.2), 200)).toBeCloseTo(toRad(35));
    expect(snapAngle(toRad(33.4), 400)).toBeCloseTo(toRad(33));
  });
});

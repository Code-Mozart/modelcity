import { describe, expect, it } from 'vitest';
import { LOGICAL_DASH_PX, LOGICAL_WIDTH_PX, markingStroke } from './markings';

describe('logical lane markings are in pixels (^975, ^976)', () => {
  it('a dash and its gap are equal, at every zoom', () => {
    for (const scale of [0.05, 1, 40, 400]) {
      const s = markingStroke('dashed', scale, '#fff', false);
      expect(s.dash).toEqual([LOGICAL_DASH_PX, LOGICAL_DASH_PX]);
      expect(s.width).toBe(LOGICAL_WIDTH_PX);
    }
  });

  it('a solid line has no dashes and square ends (^977)', () => {
    const s = markingStroke('solid', 3, '#fff', false);
    expect(s.dash).toBeUndefined();
    expect(s.cap).toBe('butt');
  });
});

describe('physical lane markings are in meters (^954)', () => {
  it('a dash is 3 m, a gap 3 m, the width 0.15 m but at least a pixel', () => {
    const s = markingStroke('dashed', 10, '#fff', true);
    expect(s.dash).toEqual([30, 30]);
    expect(s.width).toBeCloseTo(1.5, 9);
    expect(markingStroke('dashed', 1, '#fff', true).width).toBe(1);
    expect(markingStroke('solid', 10, '#fff', true).cap).toBe('butt');
  });
});

import { arrowSize } from './roadMarks';

describe('the size of a painted arrow (^1041)', () => {
  it('physical: 5 m along, inside a lane of 3 m, shown when it is a few pixels', () => {
    const big = arrowSize(3, 10, true);
    expect(big.along).toBe(50);
    expect(big.across).toBeCloseTo(24, 9);
    expect(big.shown).toBe(true);
    expect(arrowSize(3, 1, true).shown).toBe(false);
  });

  it('logical: a fixed size, hidden when the lane is narrower than the arrow is wide', () => {
    const a = arrowSize(3, 20, false);
    expect(a.shown).toBe(true);
    expect(arrowSize(3, 20, false).along).toBe(arrowSize(3, 40, false).along);
    expect(arrowSize(3, 5, false).shown).toBe(false);
  });
});

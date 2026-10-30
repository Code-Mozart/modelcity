import { describe, expect, it } from 'vitest';
import { LANE_WIDTH_M, outlinePx } from './lane';

describe('outline width (^91)', () => {
  it('is 2 px while the road is wide enough, then scales down with it', () => {
    expect(outlinePx(60)).toBe(2);
    expect(outlinePx(20)).toBe(2);
    expect(outlinePx(10)).toBe(1);
    expect(outlinePx(0)).toBe(0);
  });

  it('starts shrinking below about 6.7 px per meter', () => {
    const limit = 20 / LANE_WIDTH_M;
    expect(outlinePx(LANE_WIDTH_M * (limit + 0.1))).toBe(2);
    expect(outlinePx(LANE_WIDTH_M * (limit - 0.1))).toBeLessThan(2);
  });
});

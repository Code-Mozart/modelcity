import { describe, expect, it } from 'vitest';
import { LANE_WIDTH_M } from './lane';
import { SAME_PLACE_M, alongOrAgainst, radiusTolerance, sameWay } from './tolerance';

const deg = (d: number) => (d * Math.PI) / 180;

describe('the one tolerance for places (^865, ^879)', () => {
  it('is 2 mm: two rounded nodes are off by up to 1.41 mm', () => {
    expect(SAME_PLACE_M).toBe(0.002);
    expect(SAME_PLACE_M).toBeGreaterThan(Math.hypot(0.5, 0.5) * 2e-3);
  });

  it('a heading is the same when a point a lane width away moves by less than the tolerance', () => {
    const off = (d: number) => LANE_WIDTH_M * Math.sin(deg(d));
    expect(off(0.03)).toBeLessThan(SAME_PLACE_M);
    expect(alongOrAgainst({ th: 0 }, { th: deg(0.03) })).toBe(true);
    expect(off(0.05)).toBeGreaterThan(SAME_PLACE_M);
    expect(alongOrAgainst({ th: 0 }, { th: deg(0.05) })).toBe(false);
  });

  it('the opposite heading counts as along or against, but is not the same way', () => {
    const opposite = { th: Math.PI + deg(0.01) };
    expect(alongOrAgainst({ th: 0 }, opposite)).toBe(true);
    expect(sameWay({ th: 0 }, opposite)).toBe(false);
    expect(sameWay({ th: 0 }, { th: 2 * Math.PI })).toBe(true);
    expect(alongOrAgainst({ th: 0 }, { th: Math.PI / 2 })).toBe(false);
  });

  it('a gentle arc may differ in radius by much more than a sharp one, for the same position', () => {
    expect(radiusTolerance(Math.PI / 2)).toBeLessThan(radiusTolerance(0.3));
    expect(radiusTolerance(Math.PI / 2)).toBeGreaterThan(SAME_PLACE_M);
  });
});

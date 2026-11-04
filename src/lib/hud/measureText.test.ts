import { describe, expect, it } from 'vitest';
import type { Summary } from '../curves/measure';
import { boxText, lengthText, radiusText } from './measureText';

const summary = (segments: number, radius: Summary['radius']): Summary => ({
  length: 0,
  box: { width: 0, height: 0 },
  nodes: 0,
  segments,
  radius,
});

describe('the text of the measurements (^342)', () => {
  it('whole meters for length and box, decimals for kilometers', () => {
    expect(lengthText(86.9)).toBe('87 m');
    expect(lengthText(2345)).toBe('2.35 km');
    expect(boxText({ width: 49.6, height: 30.2 })).toBe('50 x 30 m');
    expect(boxText({ width: 2100, height: 3140 })).toBe('2.1 x 3.1 km');
  });

  it('one curve radius for one segment or when all values are equal', () => {
    const r = { min: 20, max: 20, avg: 20, median: 20 };
    expect(radiusText(summary(3, r))).toBe('Curve radius: 20.0 m');
    expect(radiusText(summary(1, { min: 10, max: 30, avg: 20, median: 20 }))).toBe(
      'Curve radius: 10.0 m',
    );
  });

  it('else all four, and none without bends', () => {
    expect(radiusText(summary(2, { min: 10, max: 30, avg: 20, median: 20 }))).toBe(
      'Curve radius: min 10.0 m, max 30.0 m, average 20.0 m, median 20.0 m',
    );
    expect(radiusText(summary(2, null))).toBeNull();
  });
});

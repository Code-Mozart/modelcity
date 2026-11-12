import { describe, expect, it } from 'vitest';
import { loopLength } from '../curves/along';
import { line } from '../curves/piece';
import type { Loop } from '../curves/union';
import { clipToSurface } from './clip';
import type { Marking } from './markings';

/** A square surface from (0, 0) to (10, 10). */
const square = (): Loop[] => [
  [
    line({ x: 0, y: 0 }, { x: 10, y: 0 }),
    line({ x: 10, y: 0 }, { x: 10, y: 10 }),
    line({ x: 10, y: 10 }, { x: 0, y: 10 }),
    line({ x: 0, y: 10 }, { x: 0, y: 0 }),
  ],
];
const dashed = (from: [number, number], to: [number, number]): Marking => ({
  kind: 'dashed',
  pieces: [line({ x: from[0], y: from[1] }, { x: to[0], y: to[1] })],
});

describe('dashed lines only on the road surface (^1058)', () => {
  it('a line that leaves the surface is cut where it leaves', () => {
    const [cut] = clipToSurface([dashed([5, 5], [20, 5])], square());
    expect(loopLength(cut!.pieces)).toBeCloseTo(5, 2);
  });

  it('a line along the outline is not drawn: half of its stroke would be off the road', () => {
    expect(clipToSurface([dashed([2, 0], [8, 0])], square())).toEqual([]);
  });

  it('a line that is inside stays whole, and a solid one is not cut', () => {
    expect(clipToSurface([dashed([1, 5], [9, 5])], square())).toHaveLength(1);
    const solid: Marking = { ...dashed([5, 5], [20, 5]), kind: 'solid' };
    expect(clipToSurface([solid], square())).toEqual([solid]);
  });
});

import { describe, expect, it } from 'vitest';
import { surfaceOf } from '../editor/surface';
import { crossPieces } from '../snap/geometry';
import { tGround } from '../testing/tGround';
import { insideOf, type Loop } from './union';
import type { Piece } from './types';

/** The test that was there before the grid (^938): the ray against every piece of the loops. */
function brute(loops: Loop[], p: { x: number; y: number }): boolean {
  const ray: Piece = {
    type: 'line',
    P: p,
    Q: { x: p.x + 1e5, y: p.y + 1e5 * 0.000123 },
  };
  return loops.flat().reduce((n, q) => n + crossPieces(ray, q).length, 0) % 2 === 1;
}

describe('the grid test of a point in the surface (^938)', () => {
  it('says what the test against every piece says, on the testing ground', () => {
    const loops = surfaceOf(tGround());
    const inside = insideOf(loops);
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const points = Array.from({ length: 400 }, () => ({
      x: random() * 1800 - 100,
      y: random() * 1400 - 100,
    }));
    const wrong = points.filter((p) => inside(p) !== brute(loops, p));
    expect(wrong).toEqual([]);
    expect(points.some((p) => inside(p))).toBe(true);
    expect(points.some((p) => !inside(p))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { buildEdge } from './edge';
import { hullOf } from './hull';
import { limitRadius, minRadius, RMIN } from './radius';
import type { Arc } from './types';

const H = Math.PI / 2;
const arcOf = (ax: number, bx: number, R: number | null) =>
  buildEdge({ x: ax, y: 0, th: 0 }, { x: bx, y: bx - ax, th: H }, R).pieces.find(
    (p) => p.type === 'arc',
  ) as Arc;

describe('the minimum radius is half the width of the road (^942)', () => {
  it('1.5 m for a road 3 m wide, whatever the width is for another one', () => {
    expect(minRadius(3)).toBe(1.5);
    expect(minRadius(5)).toBe(2.5);
    expect(RMIN).toBe(1.5);
  });

  it('a smaller radius is raised to it, the automatic one too when it is smaller', () => {
    expect(limitRadius(0.5, 10)).toBe(1.5);
    expect(limitRadius(null, 10)).toBe(10);
    expect(arcOf(0, 10, 0.5).r).toBe(1.5);
  });

  it('where even the largest radius that fits is smaller, that one stays (a bend of nodes 1 m apart)', () => {
    expect(arcOf(0, 1, null).r).toBeCloseTo(1, 9);
    expect(arcOf(0, 1, 0.5).r).toBeCloseTo(1, 9);
  });

  it('a bend of exactly the minimum radius has a sharp inner corner and its hull sides meet there', () => {
    const pieces = buildEdge({ x: 0, y: 0, th: 0 }, { x: 3, y: 3, th: H }, 1.5).pieces;
    const inner = hullOf(pieces, 3)!.sides[0];
    expect(inner.every((p) => p.type === 'line')).toBe(true);
    expect(inner).toHaveLength(2);
    expect(inner[0]!.Q.x).toBeCloseTo(inner[1]!.P.x, 9);
    expect(inner[0]!.Q.y).toBeCloseTo(inner[1]!.P.y, 9);
  });
});

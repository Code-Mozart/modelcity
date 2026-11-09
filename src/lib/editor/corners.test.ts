import { describe, expect, it } from 'vitest';
import { graphOf } from '../testing/graphHelpers';
import { cornersOf, hullsOf } from './corners';

const H = Math.PI / 2;
const corners = (g: ReturnType<typeof graphOf>) => cornersOf(hullsOf(g));
const sorted = (g: ReturnType<typeof graphOf>) =>
  corners(g)
    .map((c) => [Math.round(c.at.x * 1000) / 1000, Math.round(c.at.y * 1000) / 1000])
    .sort((p, q) => p[0]! - q[0]! || p[1]! - q[1]!);

describe('the corners of a crossing (^924)', () => {
  it('two straight segments crossing at right angles: four corners, 1.5 m from the crossing in each angle', () => {
    const g = graphOf(
      [
        [-10, 0, 0],
        [10, 0, 0],
        [0, -10, H],
        [0, 10, H],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    expect(sorted(g)).toEqual([
      [-1.5, -1.5],
      [-1.5, 1.5],
      [1.5, -1.5],
      [1.5, 1.5],
    ]);
  });
});

describe('more crossings (^924)', () => {
  it('crossing at another angle: four corners as well', () => {
    const g = graphOf(
      [
        [-10, 0, 0],
        [10, 0, 0],
        [-8, -10, 1],
        [8, 10, 1],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    expect(corners(g)).toHaveLength(4);
  });

  it('a bend crossing a straight segment: four corners', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [40, 30, H],
        [20, -10, H],
        [20, 40, H],
      ],
      [
        [0, 1, 30],
        [2, 3, null],
      ],
    );
    expect(corners(g)).toHaveLength(4);
  });
});

describe('segments that do not meet (^924)', () => {
  it('segments that do not meet have none', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [10, 0, 0],
        [0, 20, 0],
        [10, 20, 0],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    expect(corners(g)).toEqual([]);
  });
});

describe('what is no corner (^924)', () => {
  it('a node with two segments, straight on or in a bend: none', () => {
    const through = graphOf(
      [
        [0, 0, 0],
        [10, 0, 0],
        [20, 0, 0],
      ],
      [
        [0, 1, null],
        [1, 2, null],
      ],
    );
    expect(corners(through)).toEqual([]);
    const bent = graphOf(
      [
        [0, 0, 0],
        [10, 2, 0.4],
        [20, 10, 0.9],
      ],
      [
        [0, 1, null],
        [1, 2, null],
      ],
    );
    expect(corners(bent)).toEqual([]);
  });
});

describe('side by side (^924, ^100)', () => {
  it('segments side by side one lane width apart (parallel): none', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [20, 0, 0],
        [0, 3, 0],
        [20, 3, 0],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    expect(corners(g)).toEqual([]);
    const bends = graphOf(
      [
        [0, 0, 0],
        [50, 30, H],
        [0, 3, 0],
        [47, 30, H],
      ],
      [
        [0, 1, 20],
        [2, 3, 17],
      ],
    );
    expect(corners(bends)).toEqual([]);
  });
});

describe('a node with more than two segments (^921)', () => {
  it('a split: a straight road that parts into two curves has corners where the hulls of the branches part', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [20, 0, 0],
        [60, -20, -0.5],
        [60, 20, 0.5],
      ],
      [
        [0, 1, null],
        [1, 2, null],
        [1, 3, null],
      ],
    );
    const found = corners(g);
    expect(found.length).toBeGreaterThanOrEqual(1);
    // None of them is at the node or on its cap: those are the vertices of the hulls.
    expect(found.every((c) => Math.abs(c.at.x - 20) > 0.01 || Math.abs(c.at.y) > 1.49)).toBe(true);
  });

  it('a T: a segment that ends on the side of another has two corners where its sides cross the other', () => {
    const g = graphOf(
      [
        [-20, 0, 0],
        [20, 0, 0],
        [0, 30, -H],
        [0, 0, -H],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    expect(corners(g)).toHaveLength(2);
  });
});

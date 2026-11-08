import { describe, expect, it } from 'vitest';
import { graphOf } from '../testing/graphHelpers';
import { nearMisses } from './nearMisses';

const deg = (d: number) => (d * Math.PI) / 180;

describe('near misses of nodes (^884)', () => {
  const lanes = (y: number, th: number, x = 0) =>
    graphOf(
      [
        [0, 0, 0],
        [x, y, th],
      ],
      [],
    );

  it('say what a relation that looks right misses by', () => {
    const lines = nearMisses(lanes(3.0031, deg(0.2)), 0);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('node 1:');
    expect(lines[0]).toContain('distance 3.1 mm');
    expect(lines[0]).toContain('heading 0.200°');
  });

  it('say nothing about nodes that touch, or are far from it', () => {
    expect(nearMisses(lanes(3, 0), 0)).toEqual([]);
    expect(nearMisses(lanes(3.0009, deg(0.02)), 0)).toEqual([]);
    expect(nearMisses(lanes(3.5, 0), 0)).toEqual([]);
  });

  it('the other heading counts: opposite is not a miss', () => {
    expect(nearMisses(lanes(3.0031, Math.PI + deg(0.2)), 0)[0]).toContain('heading 0.200°');
  });
});

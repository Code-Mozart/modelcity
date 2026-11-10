import { describe, expect, it } from 'vitest';
import { graphOf } from '../testing/graphHelpers';
import { manoeuvreOf } from './manoeuvres';

const H = Math.PI / 2;
type N = [number, number, number];
const one = (a: N, b: N) => {
  const g = graphOf([a, b], [[0, 1, null]]);
  return manoeuvreOf(g, g.edges[0]!);
};

describe('what a segment does, as it is travelled (^1006)', () => {
  it('straight, shifts, turns and a u-turn', () => {
    expect(one([0, 0, 0], [20, 0, 0])).toBe('straight');
    expect(one([0, 0, 0], [40, 3, 0])).toBe('shift right');
    expect(one([0, 0, 0], [40, -3, 0])).toBe('shift left');
    expect(one([0, 0, 0], [20, 20, H])).toBe('right turn');
    expect(one([0, 0, 0], [20, -20, -H])).toBe('left turn');
    expect(one([0, 0, 0], [0, 20, Math.PI])).toBe('u-turn');
  });
});

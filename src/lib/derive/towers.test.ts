import { describe, expect, it } from 'vitest';
import type { Graph } from '../model/graph';
import { graphOf, threeBends, twoBends } from '../testing/graphHelpers';
import { barsOf, towersOf } from './towers';

const bars = (g: Graph) => barsOf(g);
const span = (b: { from: { x: number; y: number }; to: { x: number; y: number } }) =>
  Math.hypot(b.to.x - b.from.x, b.to.y - b.from.y);

describe('towers (^352)', () => {
  it('nodes that touch one after the other are one tower, in order across the lanes', () => {
    const g = graphOf(
      [
        [0, 6, 0],
        [0, 0, 0],
        [0, 3, 0],
        [10, 30, 0],
      ],
      [],
    );
    const towers = towersOf(g);
    expect(towers).toHaveLength(1);
    expect(towers[0]!.map((n) => n.y)).toEqual([0, 3, 6]);
  });
});

const H = Math.PI / 2;

/** Two touching nodes at x = 0: parallel straight segments to their left, a straight one and a bend to their right. */
const oneSideOnly = () =>
  graphOf(
    [
      [-40, 0, 0],
      [0, 0, 0],
      [-40, 3, 0],
      [0, 3, 0],
      [40, 0, 0],
      [40, 23, H],
    ],
    [
      [0, 1, null],
      [2, 3, null],
      [1, 4, null],
      [3, 5, 15],
    ],
  );

describe('the bars of runs of parallel segments (^350)', () => {
  it('two concentric bends: a bar at each end, across both lanes', () => {
    const found = bars(twoBends());
    expect(found).toHaveLength(2);
    found.forEach((b) => expect(span(b)).toBeCloseTo(3));
  });

  it('three lanes: one bar spans all three nodes', () => {
    expect(bars(threeBends()).map(span)).toEqual([6, 6].map((n) => expect.closeTo(n, 3)));
  });

  it('per segment, not per node: touching nodes with parallel segments on one side only get one bar', () => {
    const here = bars(oneSideOnly()).filter((b) => b.from.x === 0);
    expect(here).toHaveLength(1);
    expect(here[0]!.side.x).toBe(-1); // on the side the parallel segments run
  });

  it('no bar for touching nodes whose segments are not concentric (^334)', () => {
    expect(bars(twoBends(3, 10))).toHaveLength(0);
  });
});

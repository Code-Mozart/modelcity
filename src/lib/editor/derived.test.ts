import { describe, expect, it } from 'vitest';
import { graphOf } from '../testing/graphHelpers';
import { derivedNodes, withDerived } from './derived';
import { barsOf, towersOf } from './towers';

const W = Math.PI;
const at = (d: { x: number; y: number }[]) =>
  d.map((n) => `${Math.round(n.x * 1000) / 1000},${Math.round(n.y * 1000) / 1000}`).sort();

// ^811: A-B on top (running west), C-D below it, D is below the middle of A-B.
const figure811 = () =>
  graphOf(
    [
      [20, 0, W], // B
      [0, 0, W], // A
      [0, 3, 0], // C
      [10, 3, 0], // D
    ],
    [
      [0, 1, null],
      [2, 3, null],
    ],
  );

describe('a node that touches a segment derives a node on it (^822)', () => {
  const g = figure811;

  it('D touches A-B: a derived node ` is on it, one lane width from D', () => {
    expect(at(derivedNodes(g()))).toEqual(['10,0']);
  });

  it('with it A-B is cut in two, and the pieces beside C-D are parallel (^363)', () => {
    const d = derivedNodes(g());
    const aug = withDerived(g(), d);
    expect(aug.edges).toHaveLength(3);
    const towers = towersOf(aug).map((t) => t.length);
    expect(towers.sort()).toEqual([2, 2]);
    expect(barsOf(aug).length).toBeGreaterThan(0);
  });

  it('nothing is derived where nothing touches', () => {
    const lone = graphOf(
      [
        [20, 0, W],
        [0, 0, W],
        [0, 5, 0],
        [10, 5, 0],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    expect(derivedNodes(lone)).toEqual([]);
  });
});

const cascade = () =>
  graphOf(
    [
      [30, 0, W],
      [0, 0, W],
      [30, 3, W],
      [0, 3, W],
      [10, 6, 0],
      [20, 6, 0],
    ],
    [
      [0, 1, null],
      [2, 3, null],
      [4, 5, null],
    ],
  );

describe('the rule cascades to the lanes beside the lanes (^812)', () => {
  it('three rows: the bottom row derives two nodes on the middle row, which derive two on the top row', () => {
    const g = cascade();
    expect(at(derivedNodes(g))).toEqual(['10,0', '10,3', '20,0', '20,3']);
    const towers = towersOf(withDerived(g, derivedNodes(g)));
    // The two real towers at the ends of the rows (2 nodes each) and the two derived ones: {i, k, E} and {j, l, F}.
    expect(towers.map((t) => t.length).sort()).toEqual([2, 2, 3, 3]);
  });
});

describe('a segment that is not beside another derives nothing', () => {
  it('a node that is a lane width away but heads another way does not touch', () => {
    const g = graphOf(
      [
        [30, 0, W],
        [0, 0, W],
        [10, 3, Math.PI / 2],
        [10, 13, Math.PI / 2],
      ],
      [
        [0, 1, null],
        [2, 3, null],
      ],
    );
    expect(derivedNodes(g)).toEqual([]);
  });
});

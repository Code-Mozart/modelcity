import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { insideLoops } from '../curves/union';
import { fromFile } from '../project/file';
import { graphOf } from '../testing/graphHelpers';
import { surfaceOf } from './surface';

const H = Math.PI / 2;
const at = (x: number, y: number) => ({ x, y });
const area = (g: Parameters<typeof surfaceOf>[0]) => surfaceOf(g);

describe('the road surface is the outline of the union of the hulls (^945)', () => {
  it('a straight segment: one loop of four pieces, the road inside and the land outside', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [20, 0, 0],
      ],
      [[0, 1, null]],
    );
    const loops = area(g);
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(4);
    expect(insideLoops(loops, at(10, 0))).toBe(true);
    expect(insideLoops(loops, at(10, 1.4))).toBe(true);
    expect(insideLoops(loops, at(10, 1.6))).toBe(false);
    expect(insideLoops(loops, at(-0.1, 0))).toBe(false);
  });

  it('two segments in a row: no line across the node between them', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [20, 0, 0],
        [40, 0, 0],
      ],
      [
        [0, 1, null],
        [1, 2, null],
      ],
    );
    const loops = area(g);
    expect(loops).toHaveLength(1);
    // Two sides and two caps, the sides cut at the node.
    expect(loops[0]).toHaveLength(6);
    expect(insideLoops(loops, at(20, 1))).toBe(true);
  });
});

describe('bends (^945)', () => {
  it('a bend and the segment after it: one loop, round on the outside, sharp on the inside', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [20, 20, H],
        [20, 40, H],
      ],
      [
        [0, 1, 6],
        [1, 2, null],
      ],
    );
    const loops = area(g);
    expect(loops).toHaveLength(1);
    expect(insideLoops(loops, at(10, 0))).toBe(true);
    expect(insideLoops(loops, at(20, 30))).toBe(true);
    expect(insideLoops(loops, at(5, 12))).toBe(false);
  });
});

describe('crossings (^945)', () => {
  it('two segments crossing: one cross-shaped loop of twelve pieces', () => {
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
    const loops = area(g);
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(12);
    expect(insideLoops(loops, at(0, 0))).toBe(true);
    expect(insideLoops(loops, at(5, 5))).toBe(false);
  });
});

describe('junctions and lanes (^945)', () => {
  it('a T is one loop', () => {
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
    const loops = area(g);
    expect(loops).toHaveLength(1);
    expect(insideLoops(loops, at(0, 15))).toBe(true);
    expect(insideLoops(loops, at(10, 15))).toBe(false);
  });

  it('a split: the straight road and its two branches are one shape', () => {
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
    const loops = area(g);
    expect(loops).toHaveLength(1);
    expect(insideLoops(loops, at(10, 0))).toBe(true);
    expect(insideLoops(loops, at(20, 0))).toBe(true);
  });
});

describe('lanes and rings (^945)', () => {
  it('three lanes side by side are one wide shape without lines between them', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [20, 0, 0],
        [0, 3, 0],
        [20, 3, 0],
        [0, 6, 0],
        [20, 6, 0],
      ],
      [
        [0, 1, null],
        [2, 3, null],
        [4, 5, null],
      ],
    );
    const loops = area(g);
    expect(loops).toHaveLength(1);
    expect(insideLoops(loops, at(10, 1.5))).toBe(true);
    expect(insideLoops(loops, at(10, 4.5))).toBe(true);
    expect(insideLoops(loops, at(10, 7.6))).toBe(false);
    const ys = loops[0]!.flatMap((p) => [p.P.y, p.Q.y]);
    expect(Math.min(...ys)).toBeCloseTo(-1.5, 9);
    expect(Math.max(...ys)).toBeCloseTo(7.5, 9);
  });
});

describe('rings (^945)', () => {
  it('a ring of four quarter circles has a hole: inside it is land', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [40, 40, H],
        [0, 80, Math.PI],
        [-40, 40, -H],
      ],
      [
        [0, 1, 40],
        [1, 2, 40],
        [2, 3, 40],
        [3, 0, 40],
      ],
    );
    const loops = area(g);
    expect(loops).toHaveLength(2);
    expect(insideLoops(loops, at(0, 40))).toBe(false);
    expect(insideLoops(loops, at(0, 0))).toBe(true);
    expect(insideLoops(loops, at(0, -1))).toBe(true);
    expect(insideLoops(loops, at(0, -3))).toBe(false);
  });
});

describe('a bend tighter than half the width, ^944', () => {
  const project = JSON.parse(
    readFileSync(new URL('../../../docs/mocks/hat944.json', import.meta.url), 'utf8'),
  );
  const loops = surfaceOf(fromFile(project).graph);

  it('is one loop, its tails and the notch inside the other hull left out', () => {
    expect(loops).toHaveLength(1);
  });

  it('has the sharp inner corner where the two segments meet and the round outside', () => {
    const pts = loops[0]!.flatMap((p) => [p.P, p.Q]);
    const corner = pts.find((p) => Math.abs(p.x + 2.141) < 0.01 && Math.abs(p.y - 9.679) < 0.01);
    expect(corner).toBeDefined();
    // Nothing of the loop lies in the inner angle of the L.
    expect(insideLoops(loops, at(-4, 12))).toBe(false);
    expect(insideLoops(loops, at(-4, 8.5))).toBe(true);
    expect(insideLoops(loops, at(-0.641, 12))).toBe(true);
    expect(insideLoops(loops, at(-1.5, 9.4))).toBe(true);
  });
});

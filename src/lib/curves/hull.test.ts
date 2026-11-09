import { describe, expect, it } from 'vitest';
import { buildEdge } from './edge';
import { boxAround, boxesMeet, hullOf } from './hull';
import type { Piece } from './types';

const straight = buildEdge({ x: 0, y: 0, th: 0 }, { x: 20, y: 0, th: 0 }, null).pieces;
const bend = buildEdge({ x: 0, y: 0, th: 0 }, { x: 20, y: 20, th: Math.PI / 2 }, 20).pieces;

describe('the hull of a segment (^923)', () => {
  it('a straight segment: sides 1.5 m to each side, the right one below on the screen, and caps across the nodes', () => {
    const h = hullOf(straight, 3)!;
    expect(h.vertices).toEqual([
      { x: 0, y: 1.5 },
      { x: 0, y: -1.5 },
      { x: 20, y: 1.5 },
      { x: 20, y: -1.5 },
    ]);
    expect(h.sides[0]).toEqual([{ type: 'line', P: { x: 0, y: 1.5 }, Q: { x: 20, y: 1.5 } }]);
    expect(h.caps[0]).toMatchObject({ P: { x: 0, y: 1.5 }, Q: { x: 0, y: -1.5 } });
  });

  it('the width comes from the lane, not from a constant', () => {
    expect(hullOf(straight, 5)!.vertices[0]).toEqual({ x: 0, y: 2.5 });
  });

  it('a bend turning right: the right side has the smaller radius, the left the bigger, both round the same centre', () => {
    const h = hullOf(bend, 3)!;
    const arc = (pieces: Piece[]) => pieces.find((p) => p.type === 'arc')!;
    const [right, left] = [arc(h.sides[0]), arc(h.sides[1])];
    expect(right.type === 'arc' && left.type === 'arc' && left.r - right.r).toBeCloseTo(3, 9);
    const centre = arc(bend);
    expect(right.type === 'arc' && right.c).toEqual(centre.type === 'arc' && centre.c);
  });

  it('where the inside of an arc would turn inside out it has no side piece', () => {
    const tight = buildEdge({ x: 0, y: 0, th: 0 }, { x: 1, y: 1, th: Math.PI / 2 }, 1).pieces;
    const h = hullOf(tight, 3)!;
    const arcs = (side: Piece[]) => side.filter((p) => p.type === 'arc').length;
    expect([arcs(h.sides[0]), arcs(h.sides[1])].sort()).toEqual([0, 1]);
  });
});

describe('a hull whose inside turns inside out (^942)', () => {
  it('the pieces of a side meet: where the arc was left out they are cut at the sharp inner corner, no tails (^942)', () => {
    const tight = buildEdge({ x: 0, y: 0, th: 0 }, { x: 1, y: 1, th: Math.PI / 2 }, 1).pieces;
    for (const side of hullOf(tight, 3)!.sides) {
      side.slice(1).forEach((p, i) => {
        expect(Math.hypot(p.P.x - side[i]!.Q.x, p.P.y - side[i]!.Q.y)).toBeLessThan(1e-9);
      });
    }
  });

  it('a bend that ends the segment: the inner side runs through the centre of the arc to the end vertex, no tail (^942)', () => {
    // The user's project: B is 0.655 m below the heading line of A, so the largest radius is 0.655 m.
    const A = { x: -8.225, y: 8.179, th: 0 };
    const B = { x: -0.641, y: 8.834, th: Math.PI / 2 };
    const pieces = buildEdge(A, B, null).pieces;
    const h = hullOf(pieces, 3)!;
    const inner = h.sides[0];
    const centre = { x: B.x - 0.655, y: B.y };
    expect(inner.at(-1)!.Q.x).toBeCloseTo(h.vertices[2].x, 9);
    expect(inner.at(-1)!.Q.y).toBeCloseTo(h.vertices[2].y, 9);
    expect(inner.some((p) => Math.hypot(p.Q.x - centre.x, p.Q.y - centre.y) < 1e-6)).toBe(true);
    // Nothing of the inner side lies beyond the end of the straight piece and the centre.
    expect(Math.max(...inner.flatMap((p) => [p.P.x, p.Q.x]))).toBeLessThan(centre.x + 1e-6);
  });

  it('whatever the radius, a side is one connected curve from the start vertex to the end vertex', () => {
    const cases: [number, number, number | null][] = [
      [1, 1, null],
      [3, 3, 0.5],
      [6, 4, null],
      [20, 20, 20],
      [0.8, 5, null],
    ];
    for (const [x, y, R] of cases) {
      const h = hullOf(buildEdge({ x: 0, y: 0, th: 0 }, { x, y, th: Math.PI / 2 }, R).pieces, 3)!;
      h.sides.forEach((side, k) => {
        expect(side[0]!.P.x).toBeCloseTo(h.vertices[k]!.x, 9);
        expect(side[0]!.P.y).toBeCloseTo(h.vertices[k]!.y, 9);
        expect(side.at(-1)!.Q.x).toBeCloseTo(h.vertices[2 + k]!.x, 9);
        expect(side.at(-1)!.Q.y).toBeCloseTo(h.vertices[2 + k]!.y, 9);
        side.slice(1).forEach((p, i) => {
          expect(Math.hypot(p.P.x - side[i]!.Q.x, p.P.y - side[i]!.Q.y)).toBeLessThan(1e-6);
        });
      });
    }
  });

  it('a curve with no length has no hull', () => {
    expect(hullOf([], 3)).toBeNull();
  });
});

describe('boxes round curves', () => {
  it('a box is tight round an arc, not round the circle', () => {
    const box = boxAround(bend);
    expect(box.x1 - box.x0).toBeLessThan(21);
    expect(box.y1 - box.y0).toBeLessThan(21);
  });

  it('two boxes meet when they overlap or touch', () => {
    const a = { x0: 0, x1: 1, y0: 0, y1: 1 };
    expect(boxesMeet(a, { x0: 1, x1: 2, y0: 0, y1: 1 })).toBe(true);
    expect(boxesMeet(a, { x0: 1.1, x1: 2, y0: 0, y1: 1 })).toBe(false);
  });
});

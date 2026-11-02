import { describe, expect, it } from 'vitest';
import type { Arc, Piece } from '../curves/types';
import { crossings, crossPieces, infiniteLine, nearestOnPieces } from './geometry';

const arc = (c: { x: number; y: number }, r: number, a0: number, da: number): Arc => ({
  type: 'arc',
  c,
  P: { x: c.x + r * Math.cos(a0), y: c.y + r * Math.sin(a0) },
  Q: { x: c.x + r * Math.cos(a0 + da), y: c.y + r * Math.sin(a0 + da) },
  r,
  a0,
  da,
});
const seg = (x1: number, y1: number, x2: number, y2: number): Piece => ({
  type: 'line',
  P: { x: x1, y: y1 },
  Q: { x: x2, y: y2 },
});

describe('snap geometry (^263)', () => {
  it('the nearest point of a curve, with its tangent', () => {
    const n = nearestOnPieces([seg(0, 0, 10, 0)], { x: 4, y: 3 })!;
    expect(n.pt).toEqual({ x: 4, y: 0 });
    expect(n.d).toBe(3);
    expect([n.tx, n.ty]).toEqual([1, 0]);
  });

  it('crosses lines, only where both pieces really are', () => {
    expect(crossPieces(seg(0, 0, 10, 0), seg(5, -5, 5, 5))).toEqual([{ x: 5, y: 0 }]);
    expect(crossPieces(seg(0, 0, 10, 0), seg(15, -5, 15, 5))).toEqual([]);
    expect(crossPieces(seg(0, 0, 10, 0), seg(0, 1, 10, 1))).toEqual([]);
  });

  it('an infinite line crosses a far away piece', () => {
    const line = infiniteLine({ x: 0, y: 0 }, { x: 1, y: 0 });
    const [hit] = crossPieces(line, seg(500, -5, 500, 5));
    expect(hit!.x).toBeCloseTo(500, 6);
    expect(hit!.y).toBeCloseTo(0, 6);
  });

  it('crosses a line with an arc only on the arc', () => {
    const quarter = arc({ x: 0, y: 0 }, 10, 0, Math.PI / 2); // from (10,0) to (0,10)
    const hits = crossPieces(infiniteLine({ x: 0, y: 5 }, { x: 1, y: 0 }), quarter);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.x).toBeCloseTo(Math.sqrt(75), 6);
    expect(crossPieces(infiniteLine({ x: 0, y: -5 }, { x: 1, y: 0 }), quarter)).toEqual([]);
  });

  it('crosses two arcs', () => {
    const a = arc({ x: 0, y: 0 }, 10, -Math.PI / 2, Math.PI);
    const b = arc({ x: 10, y: 0 }, 10, Math.PI / 2, Math.PI);
    const hits = crossings([a], [b]);
    expect(hits.map((h) => Math.round(h.x * 1e6) / 1e6)).toEqual([5, 5]);
  });

  it('a touching circle gives one point, a distant one none', () => {
    const a = arc({ x: 0, y: 0 }, 3, -Math.PI / 2, Math.PI);
    expect(crossings([a], [arc({ x: 6, y: 0 }, 3, Math.PI / 2, Math.PI)])).toHaveLength(1);
    expect(crossings([a], [arc({ x: 7, y: 0 }, 3, Math.PI / 2, Math.PI)])).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { samplesAlong } from './arrows';
import { buildEdge } from './edge';
import { line } from './piece';

describe('samplesAlong (^80)', () => {
  it('places points at regular distances along a line, pointing in the direction of travel', () => {
    const s = samplesAlong([line({ x: 0, y: 0 }, { x: 10, y: 0 })], 4, 2);
    expect(s.map((p) => p.x)).toEqual([2, 6, 10]);
    expect(s.every((p) => p.tx === 1 && p.ty === 0)).toBe(true);
  });

  it('continues the spacing across pieces', () => {
    const s = samplesAlong(
      [line({ x: 0, y: 0 }, { x: 5, y: 0 }), line({ x: 5, y: 0 }, { x: 5, y: 9 })],
      4,
      1,
    );
    expect(s.map((p) => [p.x, p.y])).toEqual([
      [1, 0],
      [5, 0],
      [5, 4],
      [5, 8],
    ]);
  });

  it('follows arcs, with the tangent turning along', () => {
    const edge = buildEdge({ x: 0, y: 0, th: 0 }, { x: 20, y: 20, th: Math.PI / 2 }, null, null);
    const s = samplesAlong(edge.pieces, 3);
    expect(s.length).toBeGreaterThan(5);
    expect(s[0]!.tx).toBeGreaterThan(0.9);
    expect(s.at(-1)!.ty).toBeGreaterThan(0.5);
  });

  it('ignores degenerate pieces', () => {
    expect(samplesAlong([line({ x: 1, y: 1 }, { x: 1, y: 1 })], 4)).toEqual([]);
  });
});

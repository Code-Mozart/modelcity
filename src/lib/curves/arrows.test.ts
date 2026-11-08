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
    const edge = buildEdge({ x: 0, y: 0, th: 0 }, { x: 20, y: 20, th: Math.PI / 2 }, null);
    const s = samplesAlong(edge.pieces, 3);
    expect(s.length).toBeGreaterThan(5);
    expect(s[0]!.tx).toBeGreaterThan(0.9);
    expect(s.at(-1)!.ty).toBeGreaterThan(0.5);
  });

  it('ignores degenerate pieces', () => {
    expect(samplesAlong([line({ x: 1, y: 1 }, { x: 1, y: 1 })], 4)).toEqual([]);
  });
});

describe('samples within a circle (^864)', () => {
  const road = [
    { type: 'line', P: { x: 0, y: 0 }, Q: { x: 1000, y: 0 } },
    {
      type: 'arc',
      c: { x: 1000, y: 500 },
      r: 500,
      a0: -Math.PI / 2,
      da: Math.PI,
      P: { x: 1000, y: 0 },
      Q: { x: 1000, y: 1000 },
    },
  ] as never;

  it('are the same points as without, only fewer, and no point near the circle is left out', () => {
    const all = samplesAlong(road, 7.3);
    const within = { c: { x: 600, y: 3 }, r: 40 };
    const some = samplesAlong(road, 7.3, undefined, within);
    expect(some.length).toBeGreaterThan(0);
    expect(some.length).toBeLessThan(all.length / 5);
    const key = (s: { x: number; y: number }) => `${s.x.toFixed(6)},${s.y.toFixed(6)}`;
    const known = new Set(all.map(key));
    expect(some.every((s) => known.has(key(s)))).toBe(true);
    const inside = all.filter((s) => Math.hypot(s.x - 600, s.y - 3) <= 40);
    const have = new Set(some.map(key));
    expect(inside.every((s) => have.has(key(s)))).toBe(true);
  });

  it('on the arc too, and a circle that the road does not reach gives none', () => {
    const all = samplesAlong(road, 7.3);
    const within = { c: { x: 1500, y: 500 }, r: 30 };
    const some = samplesAlong(road, 7.3, undefined, within);
    const inside = all.filter((s) => Math.hypot(s.x - 1500, s.y - 500) <= 30);
    const have = new Set(some.map((s) => `${s.x.toFixed(6)},${s.y.toFixed(6)}`));
    expect(inside.length).toBeGreaterThan(0);
    expect(inside.every((s) => have.has(`${s.x.toFixed(6)},${s.y.toFixed(6)}`))).toBe(true);
    expect(samplesAlong(road, 7.3, undefined, { c: { x: -500, y: 900 }, r: 20 })).toEqual([]);
  });
});

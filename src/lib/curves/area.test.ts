import { describe, expect, it } from 'vitest';
import { loopArea } from './area';
import { arcAround, line } from './piece';

describe('the area of a loop of pieces (^1042)', () => {
  it('a rectangle, whichever way it runs', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 4 },
      { x: 0, y: 4 },
    ];
    const loop = pts.map((p, i) => line(p, pts[(i + 1) % 4]!));
    expect(loopArea(loop)).toBeCloseTo(24, 9);
    expect(loopArea([...loop].reverse().map((p) => line(p.Q, p.P)))).toBeCloseTo(24, 9);
  });

  it('a circle of two arcs: pi r squared', () => {
    const c = { x: 5, y: -3 };
    const [a, b] = [
      { x: 7, y: -3 },
      { x: 3, y: -3 },
    ];
    const loop = [arcAround({ c, r: 2 }, a, b, Math.PI), arcAround({ c, r: 2 }, b, a, Math.PI)];
    expect(loopArea(loop)).toBeCloseTo(Math.PI * 4, 6);
  });
});

import { describe, expect, it } from 'vitest';
import { inscribedRadius, loopArea } from './area';
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

describe('the radius of the largest circle in a loop (^1054)', () => {
  const rect = (w: number, h: number) => {
    const pts = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
    return pts.map((p, i) => line(p, pts[(i + 1) % 4]!));
  };

  it('a square: half its side; a long thin strip: half its width, however long', () => {
    expect(inscribedRadius(rect(4, 4))).toBeCloseTo(2, 1);
    expect(inscribedRadius(rect(40, 1))).toBeCloseTo(0.5, 1);
  });

  it('a circle: its radius', () => {
    const c = { x: 5, y: -3 };
    const [a, b] = [
      { x: 7, y: -3 },
      { x: 3, y: -3 },
    ];
    const loop = [arcAround({ c, r: 2 }, a, b, Math.PI), arcAround({ c, r: 2 }, b, a, Math.PI)];
    expect(inscribedRadius(loop)).toBeCloseTo(2, 1);
  });
});

import { describe, expect, it } from 'vitest';
import { buildEdge } from './edge';
import { bendAngleDeg, lengthOf, middleOf } from './measure';

describe('measurements (^303)', () => {
  it('the length of a straight segment is the distance, of a quarter circle the arc length', () => {
    const line = buildEdge({ x: 0, y: 0, th: 0 }, { x: 30, y: 0, th: 0 }, null);
    expect(lengthOf(line.pieces)).toBeCloseTo(30);
    const bend = buildEdge({ x: 0, y: 0, th: 0 }, { x: 20, y: 20, th: Math.PI / 2 }, 20);
    expect(lengthOf(bend.pieces)).toBeCloseTo((Math.PI / 2) * 20);
    const arc = bend.pieces.find((p) => p.type === 'arc')!;
    expect(bendAngleDeg(arc as { da: number })).toBeCloseTo(90);
  });

  it('the middle is half way along the length', () => {
    const line = buildEdge({ x: 0, y: 0, th: 0 }, { x: 30, y: 0, th: 0 }, null);
    expect(middleOf(line.pieces)).toMatchObject({ x: 15, y: 0 });
  });
});

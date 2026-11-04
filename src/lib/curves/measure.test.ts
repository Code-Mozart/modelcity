import { describe, expect, it } from 'vitest';
import { buildEdge } from './edge';
import { bendAngleDeg, lengthOf, middleOf, summaryOf } from './measure';

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

describe('the summary of all segments (^323)', () => {
  const bends = [20, 40, 90].map(
    (r) => buildEdge({ x: 0, y: 0, th: 0 }, { x: r, y: r, th: Math.PI / 2 }, r).pieces,
  );
  it('sums the lengths and gives min, max, average and median of the radii', () => {
    const s = summaryOf([
      ...bends,
      buildEdge({ x: 0, y: 0, th: 0 }, { x: 10, y: 0, th: 0 }, null).pieces,
    ]);
    expect(s.length).toBeCloseTo(((20 + 40 + 90) * Math.PI) / 2 + 10);
    expect(s.radius).toMatchObject({ min: 20, max: 90, median: 40 });
    expect(s.radius!.avg).toBeCloseTo(50);
  });
  it('has the count of segments and nodes and the box along the compass directions (^342)', () => {
    const line = buildEdge({ x: 0, y: 0, th: 0 }, { x: 30, y: 0, th: 0 }, null).pieces;
    const s = summaryOf(
      [
        line,
        buildEdge({ x: 30, y: 0, th: Math.PI / 2 }, { x: 30, y: 40, th: Math.PI / 2 }, null).pieces,
      ],
      3,
    );
    expect(s).toMatchObject({ nodes: 3, segments: 2 });
    expect(s.box.width).toBeCloseTo(30);
    expect(s.box.height).toBeCloseTo(40);
  });
  it('has no radii without bends', () => {
    expect(summaryOf([]).radius).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { appendNode } from './path';
import { replaceRoad, startRoad } from './roads';
import { snapParallel } from './snap';

/** One straight road along the x axis from (0,0) to (100,0). */
const straight = () => {
  const r = startRoad([], { x: 0, y: 0 });
  return replaceRoad(r.roads, 0, appendNode(r.roads[0]!, { x: 100, y: 0 }).path);
};

describe('snapping lanes next to each other (^22)', () => {
  it('snaps to one lane width beside the road, on the side of the pointer, and runs parallel', () => {
    const s = snapParallel(straight(), { x: 50, y: 3.4 }, { reach: 1, exclude: null });
    expect(s).toMatchObject({ road: 0 });
    expect(s!.pt.x).toBeCloseTo(50, 1);
    expect(s!.pt.y).toBeCloseTo(3, 1);
    expect(s!.th).toBeCloseTo(0);
    expect(
      snapParallel(straight(), { x: 50, y: -2.8 }, { reach: 1, exclude: null })!.pt.y,
    ).toBeCloseTo(-3, 1);
  });

  it('does not snap far from that line, on the road itself, or to the excluded road', () => {
    expect(snapParallel(straight(), { x: 50, y: 6 }, { reach: 1, exclude: null })).toBeNull();
    expect(snapParallel(straight(), { x: 50, y: 0.2 }, { reach: 1, exclude: null })).toBeNull();
    expect(snapParallel(straight(), { x: 50, y: 3 }, { reach: 1, exclude: 0 })).toBeNull();
  });

  it('heads the way the new lane travels: the same or the opposite way', () => {
    expect(
      snapParallel(
        straight(),
        { x: 50, y: 3 },
        { reach: 1, exclude: null, travel: { x: 1, y: 0 } },
      )!.th,
    ).toBeCloseTo(0);
    expect(
      snapParallel(
        straight(),
        { x: 50, y: 3 },
        {
          reach: 1,
          exclude: null,
          travel: { x: -1, y: 0 },
        },
      )!.th,
    ).toBeCloseTo(Math.PI);
  });
});

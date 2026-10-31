import { describe, expect, it } from 'vitest';
import { handlesOf } from './handles';
import { edgesOf } from './path';

/** A bend with straight pieces before and after its arc: the radius is smaller than the largest. */
const radiusPoints = (scale: number) => {
  const path = {
    nodes: [
      { x: 0, y: 0, th: 0 },
      { x: 40, y: -30, th: -Math.PI / 2 },
    ],
    radii: [10],
    shapes: [null],
  };
  return handlesOf(path, edgesOf(path), scale).filter((h) => h.type === 'rad' && h.i === 0);
};

describe('radius points of an arc (^128, ^139)', () => {
  it('there are three: both ends and the middle, on the bisector of the corner', () => {
    const pts = radiusPoints(4);
    expect(pts.map((h) => h.t).sort()).toEqual([0, 0.5, 1]);
  });

  it('an end within 14 px of a node is hidden, the middle one always stays', () => {
    const far = radiusPoints(0.01);
    expect(far.map((h) => h.t)).toEqual([0.5]);
  });
});

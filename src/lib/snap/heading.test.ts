import { describe, expect, it } from 'vitest';
import { suggestionsOfGraph } from '../editor/snapping';
import { mapOf } from '../testing/snapHelpers';
import { snapTo } from './engine';
import { headingFrom, placedHeading } from './heading';

// One road from (0, 0) to (40, 0), heading east (0).
const list = suggestionsOfGraph(
  mapOf([
    [
      [0, 0],
      [40, 0],
    ],
  ]),
);
const at = (x: number, y: number) => snapTo(list, { pt: { x, y }, scale: 4, pinned: [] });
const norm = (a: number | null) =>
  a === null ? null : ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

describe('the heading a snap gives (^313, ^317, ^318, ^301)', () => {
  it('a snap line gives the direction away from its base; Alt inverts it', () => {
    const south = at(0.4, 12); // on the normal line of the node at the origin, south of it
    expect(norm(headingFrom(south, false))).toBeCloseTo(Math.PI / 2);
    expect(norm(headingFrom(south, true))).toBeCloseTo((3 * Math.PI) / 2);
    expect(norm(headingFrom(at(0.4, -12), false))).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('a snap curve gives the direction of the segment, on its left the opposite one', () => {
    expect(norm(headingFrom(at(20, 0.3), false))).toBeCloseTo(0);
    expect(norm(headingFrom(at(20, 3.2), false))).toBeCloseTo(0); // right
    expect(norm(headingFrom(at(20, -3.2), false))).toBeCloseTo(Math.PI); // left
    expect(norm(headingFrom(at(20, 3.2), true))).toBeCloseTo(Math.PI);
  });

  it('a node placed on an offset curve takes the heading of its lane', () => {
    expect(norm(placedHeading(at(20, 3.2), false))).toBeCloseTo(0);
    expect(norm(placedHeading(at(20, -3.2), false))).toBeCloseTo(Math.PI);
    expect(placedHeading(at(10, 0.3), false)).toBeNull(); // the segment itself: it is merged into
  });

  it('a node placed on the normal line of a node copies the heading of the node (^318)', () => {
    expect(norm(placedHeading(at(0.4, 12), false))).toBeCloseTo(0);
    expect(placedHeading(at(30, 0.3), false)).toBeNull(); // on the line along the heading: no sideways heading
    expect(norm(placedHeading(at(0.4, 12), true))).toBeCloseTo(Math.PI);
  });
});

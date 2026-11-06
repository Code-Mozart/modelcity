import { describe, expect, it } from 'vitest';
import { snapTo } from './engine';
import { headingFrom, placedHeading } from './heading';
import { suggestionsOf, type RuleNode } from './rules';

/** Bare nodes with no segments: only the lines and points of the nodes (^265 to ^267). */
const node = (id: number, x: number, y: number, th: number): RuleNode => ({ id, x, y, th });
const hitAt = (nodes: RuleNode[], x: number, y: number) =>
  snapTo(
    suggestionsOf(nodes, [], () => 3),
    { pt: { x, y }, scale: 10, pinned: [] },
  );
const norm = (a: number | null) =>
  a === null ? null : ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

const A = node(1, 0, 0, 0);
const B = node(2, 20, -20, 0);
const C = node(3, 20, -20, Math.PI / 2);

describe('a tangent line gives the heading along itself, away from its base (^793)', () => {
  it('ahead of the node it points on, behind it back; Alt inverts', () => {
    expect(norm(placedHeading(hitAt([A], 10, 0.3), false))).toBeCloseTo(0);
    expect(norm(placedHeading(hitAt([A], -10, 0.3), false))).toBeCloseTo(Math.PI);
    expect(norm(placedHeading(hitAt([A], 10, 0.3), true))).toBeCloseTo(Math.PI);
  });

  it('is the same rule as the dragged heading', () => {
    const hit = hitAt([A], 10, 0.3);
    expect(norm(headingFrom(hit, false))).toBeCloseTo(norm(placedHeading(hit, false))!);
  });
});

describe('at a crossing the heading does not depend on the order (^792, ^793)', () => {
  it('a line without a heading does not hide the heading of the other', () => {
    // A's line along its heading crosses B's normal line, which gives 0.
    for (const order of [
      [A, B],
      [B, A],
    ]) {
      expect(norm(placedHeading(hitAt(order, 20, 0), false))).toBeCloseTo(0);
    }
  });

  it('two lines that agree give that heading', () => {
    // A's normal line (heading 0) crosses the line along the heading of F, east of F (heading 0, too).
    const F = node(5, -10, -20, 0);
    for (const order of [
      [A, F],
      [F, A],
    ]) {
      expect(norm(placedHeading(hitAt(order, 0, -20), false))).toBeCloseTo(0);
    }
  });

  it('two lines that differ give none, in either order', () => {
    for (const order of [
      [A, C],
      [C, A],
    ]) {
      expect(placedHeading(hitAt(order, 0, -20), false)).toBeNull();
      expect(headingFrom(hitAt(order, 0, -20), false)).toBeNull();
    }
  });
});

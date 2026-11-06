import { describe, expect, it } from 'vitest';
import { snapTo } from './engine';
import { headingFrom, headingSources, placedHeading } from './heading';
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

describe('the nodes a suggested heading comes from (^795)', () => {
  it('the node of a tangent line, or of every line that agrees at a crossing', () => {
    expect(headingSources(hitAt([A], 10, 0.3), false)).toEqual([1]);
    const F = node(5, -10, -20, 0);
    expect(headingSources(hitAt([A, F], 0, -20), false).sort()).toEqual([1, 5]);
  });

  it('none where the lines differ, or where there is no heading', () => {
    expect(headingSources(hitAt([A, C], 0, -20), false)).toEqual([]);
    expect(headingSources(null, false)).toEqual([]);
  });

  it('both nodes of a line they share (their heading lines coincide)', () => {
    const E = node(6, 30, 0, 0);
    expect(headingSources(hitAt([A, E], 50, 0.3), false).sort()).toEqual([1, 6]);
  });

  it('the same nodes for the dragged heading, which copies the direction', () => {
    expect(headingSources(hitAt([A], 10, 0.3), true)).toEqual([1]);
  });
});

describe('coinciding lines that give different headings give none, in either order (^792)', () => {
  it('two nodes that face each other: their heading lines are one line, with two bases', () => {
    const C1 = node(1, 0, 0, 0);
    const D1 = node(2, 30, 0, Math.PI);
    for (const order of [
      [C1, D1],
      [D1, C1],
    ]) {
      expect(placedHeading(hitAt(order, 15, 0.2), false)).toBeNull();
      expect(norm(placedHeading(hitAt(order, 45, 0.2), false))).toBeCloseTo(0); // ahead of both bases
    }
  });

  it('the two lanes of a road at one place: opposite headings share their normal line', () => {
    const east = node(1, 0, 0, 0);
    const west = node(2, 0, 10, Math.PI);
    for (const order of [
      [east, west],
      [west, east],
    ]) {
      expect(placedHeading(hitAt(order, 0.2, 20), false)).toBeNull();
    }
  });

  it('nodes with the same heading: one line, that heading', () => {
    const one = node(1, 0, 0, 0);
    const two = node(2, 0, 10, 0);
    for (const order of [
      [one, two],
      [two, one],
    ]) {
      expect(norm(placedHeading(hitAt(order, 0.2, 20), false))).toBeCloseTo(0);
    }
  });
});

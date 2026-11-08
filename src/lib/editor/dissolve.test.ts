import { describe, expect, it } from 'vitest';
import { emptyGraph, type Graph } from '../model/graph';
import { graphOf } from '../testing/graphHelpers';
import { dissolveNodes } from './dissolve';

const R = 10;
const c = Math.SQRT1_2;
/** A quarter circle of 10 m in two segments, cut at its middle. */
const circle = (r1: number | null = R, r2: number | null = R): Graph =>
  graphOf(
    [
      [0, 0, 0],
      [R * c, R - R * c, Math.PI / 4],
      [R, R, Math.PI / 2],
    ],
    [
      [0, 1, r1],
      [1, 2, r2],
    ],
  );

const straight = (y = 0, th = 0): Graph =>
  graphOf(
    [
      [0, 0, 0],
      [10, y, th],
      [20, 0, 0],
    ],
    [
      [0, 1, null],
      [1, 2, null],
    ],
  );

const run = (g: Graph, keep: number[] = []) =>
  dissolveNodes(emptyGraph(), g, { keep, selected: [], leaving: [] });

describe('nodes without an effect dissolve (^829)', () => {
  it('a node straight on dissolves (^891, figure ^814)', () => {
    const g = run(straight());
    expect(g.nodes).toHaveLength(2);
    expect(g.edges).toEqual([expect.objectContaining({ id: 0, start: 0, end: 2 })]);
  });

  it('a node 1 mm beside the line still dissolves, 5 mm does not (^865)', () => {
    expect(run(straight(0.001)).nodes).toHaveLength(2);
    expect(run(straight(0.005)).nodes).toHaveLength(3);
  });

  it('a node that turns the road stays', () => {
    expect(run(straight(0, 0.3)).nodes).toHaveLength(3);
  });

  it('a node on the same circle with the same radius dissolves', () => {
    const g = run(circle());
    expect(g.nodes).toHaveLength(2);
    expect(g.edges[0]!.radius).toBe(R);
  });
});

describe('what is the same curve (^891, ^892)', () => {
  it('a stored radius that changes nothing about the shape is no effect (^891)', () => {
    expect(run(circle(R, 20)).nodes).toHaveLength(2);
  });

  it('a node between other lane configurations stays (^892)', () => {
    const g = circle();
    const other = { ...g, edges: g.edges.map((e, i) => (i ? { ...e, lane: 2 } : e)) };
    expect(run(other).nodes).toHaveLength(3);
  });
});

describe('when and which nodes dissolve (^893, ^892)', () => {
  it('a node drawn from stays (^893)', () => {
    expect(run(straight(), [1]).nodes).toHaveLength(3);
  });

  it('a selected node stays unless the operation moved it (^893)', () => {
    const g = straight();
    const stay = { keep: [], selected: [1], leaving: [] };
    expect(dissolveNodes(g, g, { ...stay, leaving: [1] }).nodes).toHaveLength(3);
    const moved = { ...g, nodes: g.nodes.map((n) => (n.id === 1 ? { ...n, y: 0.001 } : n)) };
    expect(dissolveNodes(g, moved, stay).nodes).toHaveLength(2);
  });

  it('a node that was drawn from and is not any more is looked at, though nothing changed (^893)', () => {
    const g = straight();
    expect(dissolveNodes(g, g, { keep: [], selected: [], leaving: [1] }).nodes).toHaveLength(2);
  });

  it('a node the operation did not touch stays: nothing dissolves on load (^893)', () => {
    const g = straight();
    expect(dissolveNodes(g, g)).toBe(g);
  });
});

describe('which nodes are not looked at (^892)', () => {
  it('a leaf and a split stay (^892)', () => {
    const split = graphOf(
      [
        [0, 0, 0],
        [10, 0, 0],
        [20, 0, 0],
        [20, 10, Math.PI / 2],
      ],
      [
        [0, 1, null],
        [1, 2, null],
        [1, 3, null],
      ],
    );
    expect(run(split).nodes).toHaveLength(4);
  });

  it('three nodes in a row dissolve all the way', () => {
    const g = graphOf(
      [
        [0, 0, 0],
        [5, 0, 0],
        [10, 0, 0],
        [15, 0, 0],
        [20, 0, 0],
      ],
      [0, 1, 2, 3].map((i) => [i, i + 1, null]),
    );
    expect(run(g).nodes).toHaveLength(2);
  });
});

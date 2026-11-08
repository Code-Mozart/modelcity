import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromFile } from '../project/file';
import type { Graph } from '../model/graph';
import { derivedNodes, withDerived } from './derived';
import { parallel } from './parallel';
import { barsOf, towersOf } from './towers';
import { withRadius } from '../model/graph';

const mock = (name: string): Graph =>
  fromFile(
    JSON.parse(readFileSync(new URL(`../../../docs/mocks/${name}.json`, import.meta.url), 'utf8')),
  ).graph;

const isDerivedPair = (t: { id: number }[]) => t.length === 2 && t.every((n) => n.id < 0);

describe('the end of an arc that something touches is a derived node (^858)', () => {
  it.each(['hat856', 'hat857'])(
    '%s: a tower of two derived nodes, one at the end of the arc',
    (name) => {
      const g = mock(name);
      const derived = derivedNodes(g);
      expect(derived.map((d) => d.kind).sort()).toEqual(['radius', 'touch']);
      const towers = towersOf(withDerived(g, derived));
      expect(towers.some(isDerivedPair)).toBe(true);
    },
  );

  it('no arc end without something that touches it', () => {
    const g = mock('hat856');
    const alone = { ...g, edges: g.edges.slice(0, 1) };
    expect(derivedNodes(alone)).toEqual([]);
  });
});

describe('three parallel bends moved into S-curves stay parallel (^859)', () => {
  it('the project ^855: the east tower moved up in steps', () => {
    const g0 = mock('hat855');
    for (const dy of [0, -5, -15, -25, -35, -45]) {
      const nodes = g0.nodes.map((n) => ([26, 28, 29].includes(n.id) ? { ...n, y: n.y + dy } : n));
      const g = { ...g0, nodes };
      const [a, b, c] = g.edges;
      expect([parallel(g, a!, b!), parallel(g, b!, c!)], `dy ${dy}`).toEqual([true, true]);
    }
  });
});

describe('no derived node at the arcs of segments that are parallel all along (^869)', () => {
  const edgeKinds = (g: Graph) =>
    derivedNodes(g).filter((d) => d.kind === 'radius' && d.edge !== 1);

  it('the project ^869: the two right-hand bends are parallel, so no arc end is a derived node and the east tower has its bar', () => {
    const g = mock('hat869');
    expect(edgeKinds(g)).toEqual([]);
    const seen = withDerived(g, derivedNodes(g));
    const east = barsOf(seen).filter((b) => b.from.y < 40 && b.to.y < 40);
    expect(east).toHaveLength(1);
  });

  it('a little off in radius they are no longer parallel, and the arc ends show where the straights run side by side', () => {
    const g = withRadius(mock('hat869'), 2, 7.4);
    expect(edgeKinds(g).length).toBeGreaterThan(0);
  });
});

const parallelPairs = (g: Graph) => {
  const pairs: number[][] = [];
  for (const a of g.edges)
    for (const b of g.edges) if (a.id < b.id && parallel(g, a, b)) pairs.push([a.id, b.id]);
  return pairs;
};

describe('a segment that runs beside part of another one is parallel to that part (^873)', () => {
  it('the project ^872: segment 3 beside the arc and the straight of segment 1', () => {
    const g = mock('hat872');
    expect(parallel(g, g.edges[1]!, g.edges[3]!)).toBe(false);
    const seen = withDerived(g, derivedNodes(g));
    const pairs = parallelPairs(seen);
    const touches3 = (e: { start: number; end: number }) =>
      [3, 6].some((n) => e.start === n || e.end === n);
    const own = new Set(seen.edges.filter(touches3).map((e) => e.id));
    const beside = pairs.filter((p) => own.has(p[0]!) || own.has(p[1]!));
    expect(beside.length).toBeGreaterThanOrEqual(2);
  });
});

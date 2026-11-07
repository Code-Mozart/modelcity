import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromFile } from '../project/file';
import type { Graph } from '../model/graph';
import { derivedNodes, withDerived } from './derived';
import { parallel } from './parallel';
import { towersOf } from './towers';

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

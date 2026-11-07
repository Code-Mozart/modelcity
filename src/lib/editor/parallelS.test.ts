import { describe, expect, it } from 'vitest';
import { graphOf } from '../testing/graphHelpers';
import { withRadius, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { derivedNodes, withDerived } from './derived';
import { parallel } from './parallel';
import { towersOf } from './towers';

const W = 3;
/** S-curves from the left to the right, `n` lanes one lane width apart; lane 0 is the reference, the others have the smaller arc as radius. */
const lanes = (n: number, radii?: (i: number, R: number) => number | null): Graph => {
  const nodes: [number, number, number][] = [];
  const edges: [number, number, number | null][] = [];
  for (let i = 0; i < n; i++) {
    nodes.push([0, i * W, 0], [40, 10 + i * W, 0]);
    edges.push([2 * i, 2 * i + 1, null]);
  }
  let g = graphOf(nodes, edges);
  const R = (curveOfEdge(g, 0) as { Rmax: number }).Rmax;
  for (let i = 0; i < n; i++)
    g = withRadius(g, i, radii ? radii(i, R) : i === 0 ? null : R - i * W);
  return g;
};
const edge = (g: Graph, i: number) => g.edges[i]!;
const idsOf = (tower: { id: number }[]) => tower.map((n) => n.id);
const isDerivedTower = (ids: number[]) => ids.length === 3 && ids.every((id) => id < 0);
const radiiOf = (g: Graph, i: number) =>
  curveOfEdge(g, i)!
    .pieces.filter((p) => p.type === 'arc' && Math.abs(p.da) > 1e-3)
    .map((p) => (p.type === 'arc' ? p.r : 0));

describe('S-curves beside each other are one moved copy of the other (^828)', () => {
  it('two lanes: the second is concentric with the first, so they are parallel', () => {
    const g = lanes(2);
    expect(parallel(g, edge(g, 0), edge(g, 1))).toBe(true);
    const [own, beside] = [radiiOf(g, 0), radiiOf(g, 1)];
    expect(own).toHaveLength(2);
    // The radii differ by one lane width, one bigger and one smaller (R - w and R + w).
    expect(beside.map((r, k) => Math.abs(r - own[k]!))).toEqual(
      [W, W].map((w) => expect.closeTo(w, 6)),
    );
    expect(Math.min(...beside)).toBeCloseTo(own[0]! - W, 6);
  });

  it('the inflection points are derived nodes that form a tower', () => {
    const g = lanes(3);
    const d = derivedNodes(g).filter((n) => n.kind === 'inflection');
    expect(d).toHaveLength(3);
    const towers = towersOf(withDerived(g, derivedNodes(g)));
    expect(towers.map(idsOf).some(isDerivedTower)).toBe(true);
  });

  it('three and four lanes follow one another', () => {
    for (const n of [3, 4]) {
      const g = lanes(n);
      for (let i = 1; i < n; i++) expect(parallel(g, edge(g, i - 1), edge(g, i))).toBe(true);
    }
  });

  it('a lane whose radius does not fit is an S-curve of its own with two equal arcs, not parallel', () => {
    const g = lanes(2, (i, R) => (i === 0 ? null : R - W - 1));
    expect(parallel(g, edge(g, 0), edge(g, 1))).toBe(false);
    const radii = radiiOf(g, 1);
    expect(radii[0]).toBeCloseTo(radii[1]!, 6);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromFile } from '../project/file';
import { graphOf } from '../testing/graphHelpers';
import { withRadius, type Graph } from '../model/graph';
import { curveOfEdge } from './chains';
import { derivedNodes, withDerived } from './derived';
import { parallel, touching } from './parallel';
import { concentricWithParallel } from './sharedRadius';
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
    const g = lanes(2, (i, R) => (i === 0 ? R : R - W - 1));
    expect(parallel(g, edge(g, 0), edge(g, 1))).toBe(false);
    const radii = radiiOf(g, 1);
    expect(radii[0]).toBeCloseTo(radii[1]!, 6);
  });
});

describe('an S-curve built beside another one is built concentric (^828)', () => {
  it('its radius is the smaller arc of the other one less a lane width', () => {
    const g = lanes(2, (i, R) => (i === 0 ? R : R - 2 * W));
    expect(parallel(g, edge(g, 0), edge(g, 1))).toBe(false);
    const built = concentricWithParallel(g, 1);
    expect(parallel(built, edge(built, 0), edge(built, 1))).toBe(true);
  });
});

const sixSeven = (g: Graph) =>
  parallel(
    g,
    g.edges.find((e) => e.id === 6)!,
    g.edges.find((e) => e.id === 7)!,
  );

describe('S-curves with the same radius are parallel (^851)', () => {
  const project = () =>
    fromFile(
      JSON.parse(readFileSync(new URL('../../../docs/mocks/hat850.json', import.meta.url), 'utf8')),
    ).graph;

  it('the project ^850: both pairs, automatic radius, are parallel with one inflection tower', () => {
    const g = project();
    expect(sixSeven(g)).toBe(true);
    const radii = [radiiOf(g, 6), radiiOf(g, 7)].map((r) => Math.min(...r));
    expect(radii[0]).toBeCloseTo(radii[1]!, 6);
    const towers = towersOf(withDerived(g, derivedNodes(g)));
    const derivedIn = (t: { id: number }[]) => t.filter((n) => n.id < 0).length;
    expect(towers.map(derivedIn)).toContain(2);
  });

  it('a stored radius is shared by an automatic lane beside it', () => {
    let g = project();
    g = withRadius(g, 6, 10);
    expect(sixSeven(g)).toBe(true);
    expect(Math.min(...radiiOf(g, 7))).toBeCloseTo(10, 6);
  });

  it('a radius that is too big for the pair is the largest that fits, both stay parallel', () => {
    const g = withRadius(project(), 6, 40);
    expect(sixSeven(g)).toBe(true);
  });
});

describe('nodes that touch make parallel segments, however large the radius (^853)', () => {
  it('the project ^852: two bends of radius 123 m, nodes rounded to the millimeter', () => {
    const g = fromFile(
      JSON.parse(readFileSync(new URL('../../../docs/mocks/hat852.json', import.meta.url), 'utf8')),
    ).graph;
    expect(parallel(g, g.edges[0]!, g.edges[1]!)).toBe(true);
  });
});

describe('any two bends whose nodes touch to the millimeter are parallel (^853)', () => {
  it('random bends with the nodes rounded to whole millimeters', () => {
    const bad: number[] = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const mm = (v: number) => Math.round(v * 1000) / 1000;
    for (let i = 0; i < 300; i++) {
      const [th0, turn, len] = [rnd() * 6, 0.05 + rnd() * 1.2, 15 + rnd() * 80];
      const th1 = th0 + turn;
      const [x1, y1] = [Math.cos(th0 + turn / 2) * len, Math.sin(th0 + turn / 2) * len];
      const side = (th: number) => [-Math.sin(th) * W, Math.cos(th) * W] as const;
      const [a, b] = [side(th0), side(th1)];
      const g = graphOf(
        [
          [mm(0), mm(0), th0],
          [mm(x1), mm(y1), th1],
          [mm(a[0]), mm(a[1]), th0],
          [mm(x1 + b[0]), mm(y1 + b[1]), th1],
        ],
        [
          [0, 1, null],
          [2, 3, null],
        ],
      );
      // The rounding may put the nodes more than a millimeter off: then they do not touch.
      if (touching(g, edge(g, 0), edge(g, 1)) && !parallel(g, edge(g, 0), edge(g, 1))) bad.push(i);
    }
    expect(bad).toEqual([]);
  });
});

describe('bends that were parallel stay parallel as S-curves (^854)', () => {
  it('radii a lane width apart that are too big for the S-curves are both cut down together', () => {
    for (const k of [1.5, 3, 10]) {
      const g = lanes(2, (i, R) => k * R - (i === 0 ? 0 : W));
      expect(parallel(g, edge(g, 0), edge(g, 1)), `k ${k}`).toBe(true);
      expect(Math.min(...radiiOf(g, 1))).toBeLessThan(k * 1e3);
    }
  });
});

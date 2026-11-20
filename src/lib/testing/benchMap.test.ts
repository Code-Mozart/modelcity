import { describe, expect, it } from 'vitest';
import { makeMapText } from '../../../bench/makeMap';

/** The number of components of a graph, edges taken either way (union by size, no recursion: the maps are big). */
function components(nodeCount: number, edges: number[][]) {
  const parent = Array.from({ length: nodeCount }, (_, i) => i);
  const find = (i: number) => {
    let root = i;
    while (parent[root] !== root) root = parent[root]!;
    for (let at = i; parent[at] !== root;) [at, parent[at]] = [parent[at]!, root];
    return root;
  };
  let count = nodeCount;
  for (const [, a, b] of edges) {
    const [ra, rb] = [find(a!), find(b!)];
    if (ra !== rb) [parent[ra], count] = [rb, count - 1];
  }
  return count;
}

describe('the map of the benchmarks (^1249, ^1253)', () => {
  it.each([1, 2, 7, 100, 1000, 12_345, 100_000])(
    'has %i nodes or a few more, and is one connected graph',
    (wanted) => {
      const file = JSON.parse(makeMapText(wanted, 40)) as { nodes: number[][]; edges: number[][] };
      expect(file.nodes.length).toBeGreaterThanOrEqual(wanted);
      expect(file.nodes.length).toBeLessThan(wanted + Math.ceil(Math.sqrt(wanted)) + 1);
      expect(components(file.nodes.length, file.edges)).toBe(1);
    },
  );

  it('with the ids spread over the map (scrambled) it is the same map: one component, ids once', () => {
    const file = JSON.parse(makeMapText(5000, 40, true)) as {
      nodes: number[][];
      edges: number[][];
    };
    expect(new Set(file.nodes.map((n) => n[0])).size).toBe(file.nodes.length);
    expect(new Set(file.edges.map((e) => e[0])).size).toBe(file.edges.length);
    expect(components(file.nodes.length, file.edges)).toBe(1);
    expect(file.nodes.slice(0, 3).map((n) => n[0])).not.toEqual([0, 1, 2]);
  });

  it('every segment joins two nodes that exist, and no two have the same id', () => {
    const file = JSON.parse(makeMapText(5000, 40)) as {
      nodes: number[][];
      edges: number[][];
      nextNodeId: number;
      nextEdgeId: number;
    };
    expect([file.nextNodeId, file.nextEdgeId]).toEqual([file.nodes.length, file.edges.length]);
    const ids = new Set(file.nodes.map((n) => n[0]));
    expect(ids.size).toBe(file.nodes.length);
    expect(file.edges.every(([, a, b]) => ids.has(a!) && ids.has(b!))).toBe(true);
    expect(new Set(file.edges.map((e) => e[0])).size).toBe(file.edges.length);
  });
});

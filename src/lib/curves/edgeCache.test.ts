import { describe, expect, it } from 'vitest';
import { chainsOf } from '../editor/chains';
import { addEdge, addNode, emptyGraph, withNode } from '../model/graph';

describe('edges are kept per graph and per edge (performance)', () => {
  it('returns the same chains for the same graph, and keeps the curve of an edge that did not change', () => {
    let g = emptyGraph();
    const ids = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
      { x: 30, y: 8 },
    ].map((p) => {
      const r = addNode(g, { ...p, th: 0 });
      g = r.graph;
      return r.id;
    });
    g = addEdge(g, ids[0]!, ids[1]!);
    g = addEdge(g, ids[1]!, ids[2]!);
    g = addEdge(g, ids[2]!, ids[3]!);
    expect(chainsOf(g)).toBe(chainsOf(g));
    const moved = withNode(g, ids[3]!, { x: 31 });
    const [before, after] = [chainsOf(g)[0]!.edges, chainsOf(moved)[0]!.edges];
    expect(after[0]!.E).toBe(before[0]!.E);
    expect(after[1]!.E).toBe(before[1]!.E);
    expect(after[2]!.E).not.toBe(before[2]!.E);
  });
});

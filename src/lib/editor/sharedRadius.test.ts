import { describe, expect, it } from 'vitest';
import { addEdge, addNode, edgeOfId, emptyGraph, type Graph } from '../model/graph';
import { chainsOf } from './chains';
import { shareConcentric } from './sharedRadius';

/** Two bends one lane width apart: from the left to the right, then down. */
function lanes(shift = 3): Graph {
  let g = emptyGraph();
  const add = (x: number, y: number, th: number) => {
    const r = addNode(g, { x, y, th });
    g = r.graph;
    return r.id;
  };
  const [a, b] = [add(0, 0, 0), add(50, 30, Math.PI / 2)];
  const [c, d] = [add(0, shift, 0), add(50 - shift, 30, Math.PI / 2)];
  g = addEdge(g, a, b, 20);
  return addEdge(g, c, d, null);
}

const arcCenter = (g: Graph, edge: number) => {
  const ch = chainsOf(g).find((c) => c.edgeIds.includes(edge))!;
  const piece = ch.edges[ch.edgeIds.indexOf(edge)]!.E.pieces.find((p) => p.type === 'arc')!;
  return piece.type === 'arc' ? piece.c : null;
};

describe('shared radius of parallel segments (^77, ^282)', () => {
  it('parallel segments get the concentric radius, not the same one', () => {
    const g = shareConcentric(lanes(), 0, [0, 1]);
    expect(edgeOfId(g, 0)!.radius).toBe(20);
    expect(edgeOfId(g, 1)!.radius).toBeCloseTo(17, 6);
    const [c0, c1] = [arcCenter(g, 0)!, arcCenter(g, 1)!];
    expect(c1.x).toBeCloseTo(c0.x, 6);
    expect(c1.y).toBeCloseTo(c0.y, 6);
  });

  it('segments that are not parallel get the same radius, as before', () => {
    const g = shareConcentric(lanes(5), 0, [0, 1]);
    expect(edgeOfId(g, 1)!.radius).toBe(20);
  });

  it('an automatic radius stays automatic for all', () => {
    const base = lanes();
    const auto = { ...base, edges: base.edges.map((e) => ({ ...e, radius: null })) };
    const g = shareConcentric(auto, 0, [0, 1]);
    expect(edgeOfId(g, 1)!.radius).toBeNull();
  });
});

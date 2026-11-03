import { describe, expect, it } from 'vitest';
import { addEdge, addNode, edgeOfId, emptyGraph, withRadius, type Graph } from '../model/graph';
import { chainsOf } from './chains';
import { shareConcentric, sharedWith } from './sharedRadius';

/** Two bends one lane width apart: from the left to the right, then down. */
function lanes(shift = 3, inner: number | null = 17): Graph {
  let g = emptyGraph();
  const add = (x: number, y: number, th: number) => {
    const r = addNode(g, { x, y, th });
    g = r.graph;
    return r.id;
  };
  const [a, b] = [add(0, 0, 0), add(50, 30, Math.PI / 2)];
  const [c, d] = [add(0, shift, 0), add(50 - shift, 30, Math.PI / 2)];
  g = addEdge(g, a, b, 20);
  return addEdge(g, c, d, inner);
}

const arcCenter = (g: Graph, edge: number) => {
  const ch = chainsOf(g).find((c) => c.edgeIds.includes(edge))!;
  const piece = ch.edges[ch.edgeIds.indexOf(edge)]!.E.pieces.find((p) => p.type === 'arc')!;
  return piece.type === 'arc' ? piece.c : null;
};

describe('shared radius of parallel segments (^77, ^282)', () => {
  it('parallel segments get the concentric radius, not the same one', () => {
    const g = shareConcentric(withRadius(lanes(), 0, 25), 0, { all: [0, 1], parallels: [1] });
    expect(edgeOfId(g, 0)!.radius).toBe(25);
    expect(edgeOfId(g, 1)!.radius).toBeCloseTo(22, 6);
    const [c0, c1] = [arcCenter(g, 0)!, arcCenter(g, 1)!];
    expect(c1.x).toBeCloseTo(c0.x, 6);
    expect(c1.y).toBeCloseTo(c0.y, 6);
  });

  it('segments that are not parallel get the same radius, as before', () => {
    const g = shareConcentric(lanes(5, 14), 0, { all: [0, 1], parallels: [] });
    expect(edgeOfId(g, 1)!.radius).toBe(20);
  });

  it('segments that touch but are not concentric are not parallel: they get the same value (^334)', () => {
    const g = shareConcentric(lanes(3, 10), 0, { all: [0, 1], parallels: [] });
    expect(edgeOfId(g, 1)!.radius).toBe(20);
  });
});

describe('parallel segments stay concentric unless the segment alone is selected (^302)', () => {
  const g = lanes();
  it('nothing selected, or one node of the other segment as well: both change', () => {
    expect(sharedWith(g, [], 0).all).toEqual([0, 1]);
    expect(sharedWith(g, [0, 1, 2], 0).all).toEqual([0, 1]);
  });
  it('only its own two nodes selected: it changes alone', () => {
    expect(sharedWith(g, [0, 1], 0).all).toEqual([0]);
    // touching but not concentric: not parallel, not constrained (^334)
    expect(sharedWith(lanes(3, 10), [], 0).parallels).toEqual([]);
  });
});

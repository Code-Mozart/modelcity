import { describe, expect, it } from 'vitest';
import { addEdge, addNode, emptyGraph, removeNodes } from './graph';

describe('removing a node of a ring of two (^322)', () => {
  it('leaves no orphaned node and no segment from a node to itself', () => {
    const a = addNode(emptyGraph(), { x: 0, y: 0, th: 0 });
    const b = addNode(a.graph, { x: 20, y: 0, th: Math.PI });
    const g = addEdge(addEdge(b.graph, a.id, b.id, null), b.id, a.id, null);
    const left = removeNodes(g, [a.id], null);
    expect(left.nodes).toHaveLength(0);
    expect(left.edges).toHaveLength(0);
  });
});

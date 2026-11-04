import { describe, expect, it } from 'vitest';
import { addEdge, addNode, emptyGraph } from '../model/graph';
import { drawMode, snapping } from '../testing/snapHelpers';

const segment = (b: { x: number; y: number; th: number }) => {
  const a = addNode(emptyGraph(), { x: 0, y: 0, th: 0 });
  const z = addNode(a.graph, b);
  return addEdge(z.graph, a.id, z.id, null);
};

// The inflection point of an S-curve or a hook (^272) is a place on the curve like any other: a
// click just beside it inserts a node into the segment, never a second node on top of one (^307, ^297).
describe('the inflection point is a place on the curve (^307)', () => {
  it.each([
    ['an S-curve', { x: 60, y: 6, th: 0 }],
    ['a hook', { x: 10, y: 5, th: Math.PI }],
    ['an S-curve with a different slope', { x: 30, y: -8, th: 0 }],
  ])('on %s a click beside it inserts one node', (_name, b) => {
    const g = segment(b);
    const ed = drawMode(g);
    const J = (ed.edges[0]![0]!.E as { J: { x: number; y: number } }).J;
    ed.pointerDown(snapping(J.x + 0.4, J.y + 0.4));
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(3);
    expect(ed.graph.edges).toHaveLength(2);
    const [p, q] = ed.graph.nodes.slice(-2);
    expect(Math.hypot(p!.x - q!.x, p!.y - q!.y)).toBeGreaterThan(1);
  });
});

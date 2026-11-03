import { describe, expect, it } from 'vitest';
import { addEdge, addNode, edgeOfId, emptyGraph } from '../model/graph';
import { drawMode, snapping } from '../testing/snapHelpers';

// A quarter bend of radius 20 around (0, 20); a road is built next to it, inside (^281).
const bend = () => {
  let g = emptyGraph();
  const a = addNode(g, { x: 0, y: 0, th: 0 });
  const b = addNode(a.graph, { x: 20, y: 20, th: Math.PI / 2 });
  g = addEdge(b.graph, a.id, b.id, 20);
  return g;
};

describe('building between parallel nodes is concentric (^281)', () => {
  it('the new segment gets the radius of the curve it touches, less one lane width', () => {
    const ed = drawMode(bend());
    ed.pointerDown(snapping(0.3, 3.2));
    ed.pointerUp();
    ed.pointerDown(snapping(16.8, 20.3));
    ed.pointerUp();
    const built = ed.graph.edges.at(-1)!;
    expect(built.id).not.toBe(0);
    expect(edgeOfId(ed.graph, built.id)!.radius).toBeCloseTo(17, 1);
  });

  it('the preview is the segment that is built (^331)', () => {
    const ed = drawMode(bend());
    ed.pointerDown(snapping(0.3, 3.2));
    ed.pointerUp();
    ed.pointerMove(snapping(16.8, 20.3));
    const shown = ed.hover?.kind === 'preview' ? ed.hover.radius : undefined;
    expect(shown).toBeCloseTo(17, 1);
  });
});

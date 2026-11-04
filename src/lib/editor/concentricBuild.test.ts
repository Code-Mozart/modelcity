import { describe, expect, it } from 'vitest';
import { edgeOfId } from '../model/graph';
import { graphOf } from '../testing/graphHelpers';
import { drawMode, snapping } from '../testing/snapHelpers';

// A quarter bend of radius 20 around (0, 20); a road is built next to it, inside (^281).
const bend = () =>
  graphOf(
    [
      [0, 0, 0],
      [20, 20, Math.PI / 2],
    ],
    [[0, 1, 20]],
  );

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

  it('also when the new segment runs the opposite way', () => {
    const ed = drawMode(bend());
    const alt = (x: number, y: number) => ({ ...snapping(x, y), alt: true });
    ed.pointerDown(alt(16.8, 20.3)); // beside the end node, `Alt`: the opposite heading
    ed.pointerUp();
    ed.pointerDown(alt(0.3, 3.2)); // beside the start node
    ed.pointerUp();
    const built = ed.graph.edges.at(-1)!;
    expect(built.id).not.toBe(0);
    expect(built.radius).toBeCloseTo(17, 1);
  });
});

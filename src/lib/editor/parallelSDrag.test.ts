import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at } from '../testing/editorHelpers';
import { graphOf } from '../testing/graphHelpers';
import { withRadius } from '../model/graph';
import { chainHandles, curveOfEdge } from './chains';
import { parallel } from './parallel';

// Two S-curves beside each other (^828): the second is the first moved by one lane width.
const lanes = () => {
  const g = graphOf(
    [
      [0, 0, 0],
      [40, 10, 0],
      [0, 3, 0],
      [40, 13, 0],
    ],
    [
      [0, 1, null],
      [2, 3, null],
    ],
  );
  return withRadius(g, 1, (curveOfEdge(g, 0) as { Rmax: number }).Rmax - 3);
};
const pointer = (x: number, y: number) => at(x, y, { ctrl: true, scale: 20 });
const middle = (ed: Editor, id: number) =>
  chainHandles(ed.chains, 20).find(
    (h) => h.type === 'rad' && h.id === id && h.k === 1 && h.t === 0.5,
  )!;

describe('dragging the radius point of an S-curve beside another one (^828)', () => {
  it('the point follows the pointer on its own curve: dragged to where it is at another radius, it gets that radius', () => {
    const start = lanes();
    const R = (curveOfEdge(start, 0) as { Rmax: number }).Rmax;
    // Where the point of the second lane is when the first has the radius R - 4 (and so the second R - 7).
    const there = new Editor();
    there.load(withRadius(withRadius(start, 0, R - 4), 1, R - 7));
    const target = middle(there, 1);
    const ed = new Editor();
    ed.load(start);
    const h = middle(ed, 1);
    ed.pointerDown(pointer(h.x, h.y));
    ed.pointerMove(pointer(h.x + 0.3, h.y + 0.2));
    ed.pointerMove(pointer(target.x, target.y));
    ed.pointerUp();
    const [a, b] = ed.graph.edges.map((e) => e.radius ?? R);
    expect(a).toBeCloseTo(R - 4, 1);
    expect(b).toBeCloseTo(R - 7, 1);
    expect(parallel(ed.graph, ed.graph.edges[0]!, ed.graph.edges[1]!)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at, draw } from '../testing/editorHelpers';

/** Node A, then B further right and down, finished: draw mode again. */
function twoNodes() {
  const ed = draw([
    [0, 0],
    [30, 20],
  ]);
  ed.rightClick(at(90, 90));
  return ed;
}

/** Places around B, on its far side from the curve that arrives. */
const AROUND: [number, number][] = [
  [0, 3.2],
  [3.2, 0],
  [2.5, 2.5],
  [0, 4.5],
  [0, 5.5],
  [0, 6],
  [4, 3],
  [3, 4],
];

describe('a node is never placed on top of a node (^248, ^296)', () => {
  it.each(AROUND)('a click at %d, %d from a node leaves no two nodes at one place', (dx, dy) => {
    const ed: Editor = twoNodes();
    const p = at(30 + dx, 20 + dy, { ctrl: false });
    ed.pointerMove(p);
    ed.pointerDown(p);
    ed.pointerUp();
    const nodes = ed.graph.nodes;
    for (const [i, a] of nodes.entries()) {
      for (const b of nodes.slice(i + 1))
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.05);
    }
  });

  it('where the pointer is on a node, it is the node that is hovered', () => {
    const ed: Editor = twoNodes();
    ed.pointerMove(at(30, 21.4, { ctrl: false }));
    expect(ed.hover).toMatchObject({ kind: 'handle', handle: { type: 'node', id: 1 } });
  });
});

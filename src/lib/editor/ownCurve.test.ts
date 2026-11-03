import { describe, expect, it } from 'vitest';
import { pointOn } from '../curves/piece';
import { toRad } from '../curves/vec';
import { mapOf, drawMode, snapping } from '../testing/snapHelpers';
import { Editor } from './editor.svelte';

describe('the curve a node is moved along (^336)', () => {
  it('the dragged node snaps onto the curve of its own segment, which does not merge it', () => {
    const m = mapOf([
      [
        [0, 0],
        [40, 20],
      ],
    ]);
    const ed = new Editor();
    ed.load({ ...m, nodes: m.nodes.map((n) => (n.id === 1 ? { ...n, th: Math.PI / 2 } : n)) });
    const mid = pointOn(ed.edges[0]![0]!.E.pieces[1]!, 0.5);
    ed.pointerDown(snapping(40, 20));
    ed.pointerMove(snapping(38, 18));
    ed.pointerMove(snapping(mid.x + 0.4, mid.y + 0.4));
    const by = ed.snapped?.by[0];
    expect(by?.kind === 'curve' && by.rule).toBe('own');
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(2); // still two nodes: nothing was merged
  });
});

describe('the extend lines (^325 to ^330)', () => {
  it('only in extend mode, through the node being drawn from at 45 degrees from its heading', () => {
    const g = mapOf([
      [
        [0, 0],
        [40, 0],
      ],
    ]);
    const ed = drawMode(g);
    const at = { x: 60 * Math.cos(toRad(45)), y: 60 * Math.sin(toRad(45)) };
    ed.pointerMove(snapping(at.x, at.y));
    expect(ed.snapped?.by.some((s) => s.rule === 'extend+45')).toBe(false); // draw mode, nothing drawn from
    ed.pointerDown(snapping(40, 0));
    ed.pointerUp();
    ed.pointerMove(snapping(40 + at.x, at.y));
    expect(ed.snapped?.by.some((s) => s.rule === 'extend+45')).toBe(true);
  });
});

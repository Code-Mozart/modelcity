import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { mapOf, snapping } from '../testing/snapHelpers';
import { chainHandles } from './chains';
import { edgeOfId, withRadius } from '../model/graph';

// A bend from (0,0) heading right to (40,20), and a separate road whose node offers a snap line at x = 20.
const g = () => {
  const m = mapOf([
    [
      [0, 0],
      [40, 20],
    ],
    [
      [20, -60],
      [20, -50],
    ],
  ]);
  return { ...m, nodes: m.nodes.map((n) => (n.id === 1 ? { ...n, th: Math.PI / 2 } : n)) };
};

describe('the control points of a segment snap (^249)', () => {
  it('the radius point is pulled onto a snap line', () => {
    const ed = new Editor();
    ed.load(g());
    const rad = chainHandles(ed.chains, 4).find((h) => h.type === 'rad')!;
    ed.selection = [0, 1];
    ed.pointerDown(snapping(rad.x, rad.y));
    ed.pointerMove(snapping(rad.x - 8, rad.y - 8));
    ed.pointerMove(snapping(19, -10));
    expect(ed.snapped).not.toBeNull();
    expect(ed.snapped?.by.length).toBeGreaterThan(0);
  });

  it('a radius point snapped onto a node of its segment sets the radius to auto (^141)', () => {
    const ed = new Editor();
    ed.load(withRadius(g(), 0, 30));
    const rads = chainHandles(ed.chains, 4).filter((h) => h.type === 'rad');
    const h = rads.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0]!;
    expect(edgeOfId(ed.graph, 0)!.radius).toBe(30);
    ed.pointerDown(snapping(h.x, h.y));
    ed.pointerMove(snapping(h.x + 8, h.y + 8));
    ed.pointerMove(snapping(0.5, 0.5));
    ed.pointerUp();
    expect(edgeOfId(ed.graph, 0)!.radius).toBeNull();
  });
});

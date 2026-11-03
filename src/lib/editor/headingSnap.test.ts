import { describe, expect, it } from 'vitest';
import { toRad } from '../curves/vec';
import { nodeOf } from '../model/graph';
import { at } from '../testing/editorHelpers';
import { mapOf, snapping } from '../testing/snapHelpers';
import { Editor } from './editor.svelte';
import { chainHandles } from './chains';

const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

/** Drag the heading point of the node at the origin to `to`. */
function turn(ed: Editor, to: [number, number], extra = {}) {
  const h = chainHandles(ed.chains, 4).find((x) => x.type === 'head' && x.i === 0)!;
  ed.pointerDown(snapping(h.x, h.y));
  ed.pointerMove(snapping(h.x + 3, h.y + 3));
  ed.pointerMove({ ...snapping(...to), ...extra });
  return norm(nodeOf(ed.graph, 0)!.th);
}

describe('dragging a heading snaps (^251, ^313, ^315)', () => {
  const load = (th = 0) => {
    const ed = new Editor();
    const g = mapOf([
      [
        [0, 0],
        [40, 0],
      ],
      [
        [0, -60],
        [40, -60],
      ],
    ]);
    ed.load({ ...g, nodes: g.nodes.map((n) => (n.id === 0 ? { ...n, th } : n)) });
    return ed;
  };

  it('the steps count from the heading before the drag, not from north (^315)', () => {
    const ed = load(toRad(20));
    // 25 m = 100 px away, at 53 degrees: the 15 degree step applies, 33 degrees from where it pointed
    const th = turn(ed, [25 * Math.cos(toRad(53)), 25 * Math.sin(toRad(53))]);
    expect(th).toBeCloseTo(toRad(50));
  });

  it('Ctrl: no snap at all', () => {
    const ed = load(toRad(20));
    const th = turn(
      ed,
      [25 * Math.cos(toRad(53)), 25 * Math.sin(toRad(53))],
      at(0, 0).ctrl ? { ctrl: true } : {},
    );
    expect(th).toBeCloseTo(toRad(53));
  });

  it('a snap line gives its direction away from its base, and Alt inverts it (^313)', () => {
    expect(turn(load(), [-30, -60.5])).toBeCloseTo(Math.PI);
    expect(turn(load(), [-30, -60.5], { alt: true })).toBeCloseTo(0);
  });
});

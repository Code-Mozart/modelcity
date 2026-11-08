import { describe, expect, it } from 'vitest';
import { nodeOf } from '../model/graph';
import { graphOf } from '../testing/graphHelpers';
import { mapOf, snapping } from '../testing/snapHelpers';
import { Editor } from './editor.svelte';

const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const keys = (shift = false) => ({ alt: false, shift, ctrl: false });

/** A road, and a node of its own 60 m away, with the same heading, picked up. A node alone has no segment whose way it would follow (^888). */
function pickedUp() {
  const ed = new Editor();
  ed.load(
    graphOf(
      [
        [0, 0, 0],
        [40, 0, 0],
        [40, -60, 0],
      ],
      [[0, 1, null]],
    ),
  );
  ed.pointerDown(snapping(40, -60));
  ed.pointerMove(snapping(30, -50));
  return ed;
}
const heading = (ed: Editor, id = 2) => norm(nodeOf(ed.graph, id)!.th);

describe('a moved node and the heading of a snap (^801, ^794)', () => {
  /** Next to the node at the origin, on the side where the lane runs the other way (^253). */
  const oncoming = (ed: Editor) => {
    for (const y of [3, -3]) {
      ed.pointerMove(snapping(0.2, y + 0.2));
      if (Math.abs(heading(ed) - Math.PI) < 1e-6) return;
    }
    throw new Error('no snap with the opposite heading');
  };

  it('takes the heading of the snap, and goes back to its own where there is no snap', () => {
    const ed = pickedUp();
    oncoming(ed);
    ed.pointerMove(snapping(20, -30));
    expect(heading(ed)).toBeCloseTo(0);
  });

  it('`Shift` alone flips between the snapped heading and the original, without a move', () => {
    const ed = pickedUp();
    oncoming(ed);
    ed.modifiers(keys(true));
    expect(heading(ed)).toBeCloseTo(0);
    ed.modifiers(keys(false));
    expect(heading(ed)).toBeCloseTo(Math.PI);
  });

  it('keeps the position of the snap while `Shift` is held', () => {
    const ed = pickedUp();
    oncoming(ed);
    const at = { x: nodeOf(ed.graph, 2)!.x, y: nodeOf(ed.graph, 2)!.y };
    ed.modifiers(keys(true));
    expect(nodeOf(ed.graph, 2)).toMatchObject(at);
  });
});

describe('back where it was picked up, a node keeps its heading (^800)', () => {
  it('two parallel segments that run the same way: the left lane would run the other way', () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, -3],
          [40, -3],
        ],
        [
          [0, 0],
          [40, 0],
        ],
      ]),
    );
    ed.pointerDown(snapping(0, -3));
    ed.pointerMove(snapping(6, -9));
    ed.pointerMove(snapping(0.2, -3.2));
    expect(nodeOf(ed.graph, 0)).toMatchObject({ x: 0, y: -3 });
    expect(heading(ed, 0)).toBeCloseTo(0);
  });
});

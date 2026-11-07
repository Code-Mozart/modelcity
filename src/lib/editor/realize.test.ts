import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at } from '../testing/editorHelpers';
import { graphOf } from '../testing/graphHelpers';

const W = Math.PI;
// ^811: A-B on top (running west), C-D below it: D is below the middle of A-B, so a derived node is at (10, 0).
const figure = () =>
  graphOf(
    [
      [20, 0, W],
      [0, 0, W],
      [0, 3, 0],
      [10, 3, 0],
    ],
    [
      [0, 1, null],
      [2, 3, null],
    ],
  );
const editor = () => {
  const ed = new Editor();
  ed.load(figure());
  return ed;
};
const pointer = (x: number, y: number) => at(x, y, { ctrl: true, scale: 20 });

describe('a derived node is made real by dragging it (^824)', () => {
  it('it is hovered, and a drag makes a real node that moves with the pointer, in one step', () => {
    const ed = editor();
    ed.pointerMove(pointer(10, 0));
    expect(ed.hover).toMatchObject({ kind: 'candidate', derived: true });
    expect(ed.hintTarget.kind).toBe('derived');
    ed.pointerDown(pointer(10, 0));
    ed.pointerMove(pointer(10.5, -1));
    ed.pointerMove(pointer(11, -2));
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(5);
    expect(ed.graph.edges).toHaveLength(3);
    expect(ed.timeline.history.past.at(-1)?.name).toBe('realize node');
    ed.key('z', { ctrl: true, shift: false });
    expect(ed.graph.nodes).toHaveLength(4);
  });

  it('a click without moving changes nothing', () => {
    const ed = editor();
    const was = ed.graph;
    ed.pointerMove(pointer(10, 0));
    ed.pointerDown(pointer(10, 0));
    ed.pointerUp();
    expect(ed.graph).toBe(was);
    expect(ed.timeline.history.past).toHaveLength(0);
  });

  it('the new node is where the derived node was, with the heading of the segment there', () => {
    const ed = editor();
    ed.pointerMove(pointer(10, 0));
    ed.pointerDown(pointer(10, 0));
    ed.pointerMove(pointer(10.1, 0));
    ed.pointerMove(pointer(10, 0));
    expect(ed.graph.nodes.at(-1)).toMatchObject({ x: 10, y: 0, th: W });
  });
});

describe('a derived node in draw mode (^824)', () => {
  it('in draw mode it is just the curve', () => {
    const ed = editor();
    ed.enterDrawMode();
    ed.pointerMove(pointer(10, 0));
    expect(ed.hover).toMatchObject({ kind: 'candidate' });
    expect(ed.hover).not.toMatchObject({ derived: true });
  });
});

describe('on an S-curve of the largest radius (^824)', () => {
  it('the inflection point is dragged, not the radius points that are at the same place', () => {
    const ed = new Editor();
    ed.load(
      graphOf(
        [
          [0, 0, 0],
          [40, 10, 0],
        ],
        [[0, 1, null]],
      ),
    );
    ed.pointerMove(pointer(20, 5));
    expect(ed.hover).toMatchObject({ kind: 'candidate', derived: true });
    ed.pointerMove(pointer(10.3, 1.27));
    expect(ed.hover).toMatchObject({ kind: 'handle' });
  });
});

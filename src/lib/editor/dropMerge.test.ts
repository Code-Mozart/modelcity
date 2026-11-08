import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at, draw } from '../testing/editorHelpers';
import { drag, mapOf } from '../testing/snapHelpers';
import { dropOf, dropPreview } from './drop';

/** Ctrl held: no snapping, only the world distance counts. */
const plain = (x: number, y: number) => at(x, y);

/** A node dragged to (20, y) next to the curve of a road along y = 0, snapping off. */
function dropNextToCurve(y: number) {
  const ed = new Editor();
  const road: [number, number][] = [
    [0, 0],
    [40, 0],
  ];
  const other: [number, number][] = [
    [10, 40],
    [10, 60],
  ];
  ed.load(mapOf([road, other]));
  ed.pointerDown(plain(10, 40));
  ed.pointerMove(plain(18, 8));
  ed.pointerMove(plain(20, y));
  ed.pointerUp();
  return ed;
}

describe('merging near a curve (^283)', () => {
  it('a node within 2 mm of a curve is merged into it, even with snapping off', () => {
    const ed = dropNextToCurve(0.001);
    expect(ed.graph.edges).toHaveLength(3);
    expect(ed.graph.nodes.some((n) => n.x === 20 && n.y === 0)).toBe(true);
  });

  it('farther than 2 mm it is not, with snapping off', () => {
    expect(dropNextToCurve(0.01).graph.edges).toHaveLength(2);
  });
});

describe('showing the merge (^284, ^285)', () => {
  it('the curves after the merge are shown while the node is dragged over a node', () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, 0],
          [40, 0],
          [80, 0],
        ],
      ]),
    );
    ed.pointerDown(plain(40, 0));
    ed.pointerMove(plain(30, 10));
    ed.pointerMove(plain(0.001, 0.001));
    const drop = dropOf(ed.graph, ed.press, ed.snapped);
    expect(drop).toMatchObject({ node: 0 });
    expect(dropPreview(ed.graph, ed.press, drop)).toHaveLength(2);
    ed.pointerMove(plain(20, 30));
    expect(dropOf(ed.graph, ed.press, ed.snapped)).toBeNull();
  });

  it('the end of a segment merged into its start is the same as removing it: no node is left alone', () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, 0],
          [40, 0],
        ],
      ]),
    );
    drag(ed, [40, 0], [0.001, 0.001]);
    expect(ed.graph.nodes).toEqual([]);
    expect(ed.graph.edges).toEqual([]);
  });
});

describe('merging in extend mode (^285)', () => {
  it('the node being drawn from, dropped on the start of its road, is merged: the road goes on from the merged node, no segment of length zero', () => {
    const ed = draw([
      [0, 0],
      [40, 0],
    ]);
    ed.pointerDown(plain(40, 0));
    ed.pointerMove(plain(30, 8));
    ed.pointerMove(plain(0.001, 0.001));
    ed.pointerUp();
    expect(ed.graph.edges).toEqual([]);
    expect(ed.graph.nodes).toHaveLength(1);
    expect(ed.phase).toBe('extend');
    expect(ed.active).toBe(ed.graph.nodes[0]!.id);
  });
});

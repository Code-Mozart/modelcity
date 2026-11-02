import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at } from '../testing/editorHelpers';
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
  it('a node within 0.1 m of a curve is merged into it, even with snapping off', () => {
    const ed = dropNextToCurve(0.05);
    expect(ed.graph.edges).toHaveLength(3);
    expect(ed.graph.nodes.some((n) => n.x === 20 && n.y === 0)).toBe(true);
  });

  it('farther than 0.1 m it is not, with snapping off', () => {
    expect(dropNextToCurve(0.5).graph.edges).toHaveLength(2);
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
    ed.pointerMove(plain(0.05, 0.05));
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
    drag(ed, [40, 0], [0.05, 0.05]);
    expect(ed.graph.nodes).toEqual([]);
    expect(ed.graph.edges).toEqual([]);
  });
});

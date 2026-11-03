import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { drag, mapOf } from '../testing/snapHelpers';

describe('a node that is dropped merges (^248, ^268)', () => {
  it('dropped on another node it is merged into it, which keeps its heading', () => {
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
    drag(ed, [80, 0], [0.2, 0.2]);
    expect(ed.graph.nodes.map((n) => n.id)).toEqual([0, 1]);
    expect(ed.graph.edges.map((e) => [e.start, e.end])).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });
});

describe('a node that is dropped on a curve (^268)', () => {
  it('dropped on a curve it joins the segment, which is split there', () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, 0],
          [40, 0],
        ],
        [
          [10, 40],
          [10, 60],
        ],
      ]),
    );
    drag(ed, [10, 40], [20, 0.5]);
    expect(ed.graph.nodes).toHaveLength(4);
    expect(ed.graph.nodes.some((n) => n.x === 20 && n.y === 0)).toBe(true);
    expect(ed.graph.edges).toHaveLength(3);
  });

  it('a merge is one undoable step', () => {
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
    drag(ed, [80, 0], [0.2, 0.2]);
    ed.key('z', { ctrl: true, shift: false });
    expect(ed.graph.nodes).toHaveLength(3);
  });
});

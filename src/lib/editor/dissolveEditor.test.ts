import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { click, draw } from '../testing/editorHelpers';
import { graphOf } from '../testing/graphHelpers';
import { dissolveNodes } from './dissolve';
import { emptyGraph, type Graph } from '../model/graph';
import { parallel } from './parallel';
import { derivedNodes } from './derived';

/** Lanes of straight segments, 3 m apart, each cut in the middle at x = 10. */
const lanes = (n: number, cut = true): Graph =>
  graphOf(
    Array.from({ length: n }, (_, i): [number, number, number][] => [
      [0, 3 * i, 0],
      ...(cut ? [[10, 3 * i, 0] as [number, number, number]] : []),
      [20, 3 * i, 0],
    ]).flat(),
    Array.from({ length: n }, (_, i) =>
      cut
        ? ([
            [3 * i, 3 * i + 1, null],
            [3 * i + 1, 3 * i + 2, null],
          ] as [number, number, null][])
        : ([[2 * i, 2 * i + 1, null]] as [number, number, null][]),
    ).flat(),
  );

describe('nodes that parallel segments need (^894)', () => {
  it('a tower of nodes without an effect dissolves together, the lanes stay parallel', () => {
    const g = dissolveNodes(emptyGraph(), lanes(3));
    expect(g.nodes).toHaveLength(6);
    expect(g.edges).toHaveLength(3);
    expect(parallel(g, g.edges[0]!, g.edges[1]!)).toBe(true);
  });

  it('a node a node beside it touches becomes a derived node: the lane stays parallel (^822)', () => {
    const g = lanes(2);
    // The lane beside has an effect at x = 10 (another lane configuration), so only the first dissolves.
    const other = { ...g, edges: g.edges.map((e) => (e.id === 3 ? { ...e, lane: 2 } : e)) };
    const after = dissolveNodes(emptyGraph(), other);
    expect(after.nodes).toHaveLength(5);
    expect(derivedNodes(after).some((d) => Math.abs(d.x - 10) < 0.01)).toBe(true);
  });
});

describe('dissolving in the editor (^893)', () => {
  it('drawing a node straight on removes the one before; one undo brings it back', () => {
    const ed = draw([
      [0, 0],
      [40, 0],
    ]);
    expect(ed.graph.nodes).toHaveLength(2);
    click(ed, 80, 0);
    expect(ed.graph.nodes).toHaveLength(2);
    expect(ed.graph.edges).toHaveLength(1);
    ed.key('z', { ctrl: true, shift: false });
    expect(ed.graph.nodes).toHaveLength(2);
    expect(ed.graph.edges).toHaveLength(1);
    expect(ed.graph.nodes.some((n) => n.x === 40)).toBe(true);
  });
});

describe('what stays in the editor (^892, ^893)', () => {
  it('a node that turns the road is kept', () => {
    const ed = draw([
      [0, 0],
      [40, -20],
      [80, 0],
    ]);
    expect(ed.graph.nodes).toHaveLength(3);
  });

  it('a map that is loaded is left as it is (^868 is the repair on load)', () => {
    const ed = new Editor();
    ed.load(
      graphOf(
        [
          [0, 0, 0],
          [10, 0, 0],
          [20, 0, 0],
        ],
        [
          [0, 1, null],
          [1, 2, null],
        ],
      ),
    );
    expect(ed.graph.nodes).toHaveLength(3);
  });
});

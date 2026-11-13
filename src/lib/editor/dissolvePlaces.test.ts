import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at, click } from '../testing/editorHelpers';
import { graphOf } from '../testing/graphHelpers';
import { derivedNodes } from './derived';

const pointer = (x: number, y: number) => at(x, y, { ctrl: true, scale: 20 });

describe('places where a node has no effect (^829, ^1064)', () => {
  it('extending the end of one of two parallel segments, then collapsing the end: it is a derived node now', () => {
    const ed = new Editor();
    // (A)-->--(B)   and   (C)-->--(D) below it
    ed.load(
      graphOf(
        [
          [0, 0, 0],
          [20, 0, 0],
          [0, 3, 0],
          [20, 3, 0],
        ],
        [
          [0, 1, null],
          [2, 3, null],
        ],
      ),
    );
    ed.enterDrawMode();
    click(ed, 20, 0);
    click(ed, 40, 0);
    expect(ed.graph.edges).toHaveLength(3);
    ed.selection = ed.graph.nodes.filter((n) => n.x === 20 && n.y === 0).map((n) => n.id);
    ed.key('c');
    expect(ed.graph.edges).toHaveLength(2);
    expect(ed.graph.nodes.some((n) => n.x === 20 && n.y === 0)).toBe(false);
    expect(derivedNodes(ed.graph).some((d) => Math.abs(d.x - 20) < 0.01 && d.y === 0)).toBe(true);
  });
});

describe('a realized derived node (^895, ^1064)', () => {
  it('a derived node of an S-curve that is realized and dropped where it was collapses again by the control', () => {
    const ed = new Editor();
    ed.load(
      graphOf(
        [
          [0, 0, 0],
          [40, 10, 0],
        ],
        [[0, 1, 8]],
      ),
    );
    const inflection = derivedNodes(ed.graph).find((d) => d.kind === 'inflection')!;
    ed.pointerMove(pointer(inflection.x, inflection.y));
    ed.pointerDown(pointer(inflection.x, inflection.y));
    ed.pointerMove(pointer(inflection.x + 0.5, inflection.y - 1));
    expect(ed.graph.nodes).toHaveLength(3);
    ed.pointerMove(pointer(inflection.x, inflection.y));
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(3);
    ed.selection = ed.graph.nodes.filter((n) => n.id > 1).map((n) => n.id);
    ed.key('c');
    expect(ed.graph.nodes).toHaveLength(2);
    expect(ed.graph.edges).toHaveLength(1);
    expect(ed.graph.edges[0]!.radius).toBe(8);
  });
});

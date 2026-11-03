import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at } from '../testing/editorHelpers';
import { mapOf } from '../testing/snapHelpers';

/** Two roads of three nodes; the first three nodes of the first are selected. */
function selected() {
  const ed = new Editor();
  ed.load(
    mapOf([
      [
        [0, 0],
        [40, 0],
        [80, 0],
      ],
      [
        [0, 50],
        [40, 50],
      ],
    ]),
  );
  for (const x of [0, 40, 80]) {
    ed.pointerDown(at(x, 0, { shift: true }));
    ed.pointerUp();
  }
  return ed;
}

describe('a right click on the selection removes all of it (^290)', () => {
  it('on one of several selected nodes', () => {
    const ed = selected();
    ed.rightClick(at(40, 0));
    expect(ed.graph.nodes.map((n) => n.id)).toEqual([3, 4]);
  });

  it('on a segment between two selected nodes', () => {
    const ed = selected();
    ed.rightClick(at(20, 0));
    expect(ed.graph.nodes.map((n) => n.id)).toEqual([3, 4]);
  });

  it('on a node that is not selected, only that node', () => {
    const ed = selected();
    ed.rightClick(at(40, 50));
    expect(ed.graph.nodes).toHaveLength(3);
  });

  it('with one selected node, only that node, as before', () => {
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
    ed.pointerDown(at(0, 0));
    ed.pointerUp();
    ed.rightClick(at(0, 0));
    expect(ed.graph.nodes).toHaveLength(2);
  });
});

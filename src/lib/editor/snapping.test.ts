import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { nodeOf } from '../model/graph';
import { at } from '../testing/editorHelpers';
import { drag, drawMode, mapOf, snapping } from '../testing/snapHelpers';

describe('a node that is placed snaps (^101, ^112)', () => {
  const g = () =>
    mapOf([
      [
        [0, 0],
        [40, 0],
      ],
    ]);

  it('the preview and the node are on the line along the normal of a node', () => {
    const ed = drawMode(g());
    ed.pointerMove(snapping(1, -30));
    expect(ed.hover).toMatchObject({ kind: 'preview', node: { x: 0, y: -30 } });
    ed.pointerDown(snapping(1, -30));
    ed.pointerUp();
    expect(ed.graph.nodes.at(-1)).toMatchObject({ x: 0, y: -30 });
  });

  it('Ctrl turns it off', () => {
    const ed = drawMode(g());
    ed.pointerMove(at(1, -30));
    expect(ed.hover).toMatchObject({ kind: 'preview', node: { x: 1, y: -30 } });
    expect(ed.snapped).toBeNull();
  });

  it('a node is placed beside others, not on their position', () => {
    const ed = drawMode(g());
    ed.pointerMove(snapping(0, 5.5));
    expect(ed.snapped?.by[0]?.kind === 'point' && ed.snapped.by[0].node).toBeFalsy();
  });
});

describe('a node that is moved snaps (^101, ^113, ^264)', () => {
  it('onto the line along the normal of another node', () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, 0],
          [40, 0],
        ],
      ]),
    );
    drag(ed, [40, 0], [1.5, 20]);
    expect(nodeOf(ed.graph, 1)).toMatchObject({ x: 0, y: 20 });
  });

  it('its previous position is a snap point', () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, 0],
          [40, 0],
        ],
      ]),
    );
    drag(ed, [40, 0], [41, 0.5]);
    expect(nodeOf(ed.graph, 1)).toMatchObject({ x: 40, y: 0 });
  });
});

describe('a group that is moved (^264)', () => {
  it('the others of a group follow the node that is dragged (^264)', () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, 0],
          [40, 0],
        ],
        [
          [0, 50],
          [40, 50],
        ],
      ]),
    );
    ed.pointerDown(snapping(40, 0));
    ed.pointerUp();
    ed.pointerDown(snapping(40, 50));
    ed.pointerUp();
    drag(ed, [40, 50], [1.5, 80]);
    expect(nodeOf(ed.graph, 3)).toMatchObject({ x: 0, y: 80 });
  });
});

describe('what the moved node keeps (^113, ^300)', () => {
  it('its old normal line: moving it sideways or further along its heading', () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, 0],
          [40, 10],
        ],
      ]),
    );
    drag(ed, [40, 10], [41.5, 25]);
    expect(nodeOf(ed.graph, 1)).toMatchObject({ x: 40, y: 25 });
  });

  it('its old heading line', () => {
    const ed = new Editor();
    ed.load(
      mapOf([
        [
          [0, 0],
          [40, 10],
        ],
      ]),
    );
    drag(ed, [40, 10], [60, 11.5]);
    expect(nodeOf(ed.graph, 1)).toMatchObject({ x: 60, y: 10 });
  });
});

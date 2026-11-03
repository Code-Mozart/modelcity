import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at } from '../testing/editorHelpers';
import { drag, drawMode, mapOf, snapping } from '../testing/snapHelpers';

const road = () =>
  mapOf([
    [
      [0, 0],
      [40, 0],
    ],
  ]);

describe('Esc cancels a drag (^295)', () => {
  it('a node that is dragged goes back, no step is recorded', () => {
    const ed = new Editor();
    ed.load(road());
    const before = ed.graph;
    ed.pointerDown(at(40, 0));
    ed.pointerMove(at(30, 20));
    ed.pointerMove(at(20, 30));
    expect(ed.graph).not.toBe(before);
    ed.key('Escape');
    expect(ed.graph).toBe(before);
    ed.pointerUp();
    expect(ed.graph).toBe(before);
    expect(ed.timeline.history.past).toHaveLength(0);
  });

  it('the pointer that goes on moving afterwards changes nothing', () => {
    const ed = new Editor();
    ed.load(road());
    const before = ed.graph;
    ed.pointerDown(at(40, 0));
    ed.pointerMove(at(30, 20));
    ed.key('Escape');
    ed.pointerMove(at(10, 10));
    ed.pointerUp();
    expect(ed.graph).toBe(before);
  });
});

describe('Esc while placing a node (^295)', () => {
  it('a node that is placed with its heading is not placed', () => {
    const ed = drawMode(road());
    ed.pointerDown(snapping(60, 40));
    ed.pointerMove(snapping(70, 50));
    ed.key('Escape');
    ed.pointerUp();
    expect(ed.graph.nodes).toHaveLength(2);
    expect(ed.phase).toBe('draw');
  });

  it('without a drag Esc is what it was: it finishes the road', () => {
    const ed = drawMode(road());
    drag(ed, [60, 40], [60, 40]);
    ed.key('Escape');
    expect(ed.phase).toBe('select');
  });
});

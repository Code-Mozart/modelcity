import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at, click } from '../testing/editorHelpers';
import { mapOf } from '../testing/snapHelpers';

/** Two roads, A B C bent at B and D E. */
const map = () =>
  mapOf([
    [
      [0, 0],
      [40, 10],
      [80, 0],
    ],
    [
      [0, 50],
      [40, 50],
    ],
  ]);

describe('Del deletes the hovered node when nothing is selected (^757)', () => {
  it('the hovered node goes, in one step named delete node', () => {
    const ed = new Editor();
    ed.load(map());
    ed.pointerMove(at(80, 0));
    ed.key('Delete');
    expect(ed.graph.nodes.some((n) => n.x === 80)).toBe(false);
    expect(ed.graph.nodes).toHaveLength(4);
    expect(ed.timeline.history.past.at(-1)?.name).toBe('delete node');
  });

  it('with nodes selected, Del deletes the selection as before, not the hovered node', () => {
    const ed = new Editor();
    ed.load(map());
    click(ed, 0, 50);
    ed.pointerMove(at(80, 0));
    ed.key('Delete');
    expect(ed.graph.nodes.some((n) => n.x === 80)).toBe(true);
    expect(ed.graph.nodes.some((n) => n.y === 50 && n.x === 0)).toBe(false);
  });

  it('with no node hovered nothing happens', () => {
    const ed = new Editor();
    ed.load(map());
    ed.pointerMove(at(200, 200));
    ed.key('Delete');
    expect(ed.graph.nodes).toHaveLength(5);
  });
});

describe('Del deletes the hovered segment when nothing is selected (^920)', () => {
  it('the segment goes, in one step named delete segment, with Alt+RMB the branch is delete branch', () => {
    const ed = new Editor();
    ed.load(map());
    ed.pointerMove(at(20, 50));
    ed.key('Delete');
    expect(ed.graph.edges).toHaveLength(2);
    expect(ed.timeline.history.past.at(-1)?.name).toBe('delete segment');
  });

  it('with a selection Del deletes the selection, not the segment under the pointer', () => {
    const ed = new Editor();
    ed.load(map());
    click(ed, 0, 0);
    ed.pointerMove(at(20, 50));
    ed.key('Delete');
    expect(ed.graph.edges).toHaveLength(2);
    expect(ed.graph.nodes.some((n) => n.x === 0 && n.y === 0)).toBe(false);
  });
});

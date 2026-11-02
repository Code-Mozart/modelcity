import { describe, expect, it } from 'vitest';
import { at, bareCurvePoint, click, draw, roadThenDrawMode } from '../testing/editorHelpers';

const road = () => {
  const ed = draw([
    [0, 0],
    [40, -20],
    [80, 0],
  ]);
  ed.key('Escape');
  return ed;
};

describe('Esc deselects all (^218)', () => {
  it('in select mode with a selection: a selection step, in the batch of the selection before', () => {
    const ed = road();
    click(ed, 0, 0);
    click(ed, 40, -20);
    ed.key('Escape');
    expect(ed.selection).toEqual([]);
    expect(ed.history.past.at(-1)!.name).toBe('deselect all');
    expect(ed.history.past.at(-1)!.batch).toBe(ed.history.past.at(-2)!.batch);
  });

  it('with nothing selected it does nothing, and in draw mode it still finishes the road', () => {
    const ed = road();
    const steps = ed.history.past.length;
    ed.key('Escape');
    expect(ed.history.past).toHaveLength(steps);
    const drawing = roadThenDrawMode();
    click(drawing, 200, 200);
    drawing.key('Escape');
    expect(drawing.drawing).toBe(false);
  });
});

describe('a right click on a segment removes it (^160)', () => {
  it('in select mode: the segment, and the nodes that had no other', () => {
    const ed = road();
    const m = bareCurvePoint(ed, 0);
    ed.rightClick(at(m.x, m.y));
    expect(ed.graph.edges).toHaveLength(1);
    expect(ed.graph.nodes).toHaveLength(2);
    expect(ed.history.past.at(-1)!.name).toBe('remove segment');
  });

  it('a segment in the middle of a road splits the road in two', () => {
    const ed = draw([
      [0, 0],
      [40, -20],
      [80, 0],
      [120, -20],
    ]);
    ed.key('Escape');
    const m = bareCurvePoint(ed, 1);
    ed.rightClick(at(m.x, m.y));
    expect(ed.graph.edges).toHaveLength(2);
    expect(ed.chains).toHaveLength(2);
    expect(ed.graph.nodes).toHaveLength(4);
  });
});

describe('a right click on a segment while drawing (^160)', () => {
  it('the road goes on from its neighbour when its node loses its only segment', () => {
    const ed = draw([
      [0, 0],
      [40, -20],
      [80, 0],
    ]);
    const m = bareCurvePoint(ed, 1);
    const tip = ed.active;
    ed.rightClick(at(m.x, m.y));
    expect(ed.drawing).toBe(true);
    expect(ed.active).not.toBeNull();
    expect(ed.active).not.toBe(tip);
    expect(ed.graph.nodes).toHaveLength(2);
  });

  it('on a node it still deletes the node, on empty canvas it still finishes the road', () => {
    const ed = road();
    ed.rightClick(at(40, -20));
    expect(ed.graph.nodes).toHaveLength(2);
    const drawing = roadThenDrawMode();
    drawing.rightClick(at(300, 300));
    expect(drawing.drawing).toBe(false);
  });
});

describe('what the pointer is over is outlined (^99)', () => {
  it('a hovered segment, and with Alt its whole branch', () => {
    const ed = road();
    const m = bareCurvePoint(ed, 0);
    ed.pointerMove(at(m.x, m.y));
    expect(ed.hoverSegments).toEqual([{ road: 0, i: 0 }]);
    ed.pointerMove(at(m.x, m.y, { alt: true }));
    expect(ed.hoverSegments).toHaveLength(2);
    ed.pointerMove(at(300, 300));
    expect(ed.hoverSegments).toEqual([]);
  });
});

describe('the controls that were used are reported (^110)', () => {
  it('selecting by click, with Shift, with a box, deleting, undoing', () => {
    const ed = road();
    click(ed, 0, 0);
    expect(ed.used?.id).toBe('select');
    ed.pointerDown(at(40, -20, { shift: true }));
    ed.pointerUp();
    expect(ed.used?.id).toBe('select-add');
    ed.pointerDown(at(-50, -50));
    ed.pointerMove(at(150, 50));
    ed.pointerUp();
    expect(ed.used?.id).toBe('select-box');
    ed.key('Delete');
    expect(ed.used?.id).toBe('delete-selected');
    ed.key('z', { ctrl: true, shift: false });
    expect(ed.used?.id).toBe('undo');
    ed.key('y', { ctrl: true, shift: false });
    expect(ed.used?.id).toBe('redo');
  });

  it('moving a node is not a select operation', () => {
    const ed = road();
    ed.pointerDown(at(40, -20));
    ed.pointerMove(at(50, -30));
    const before = ed.used?.seq;
    ed.pointerUp();
    expect(ed.used?.seq).toBe(before);
  });
});

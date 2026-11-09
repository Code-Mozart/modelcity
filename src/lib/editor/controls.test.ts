import { describe, expect, it } from 'vitest';
import { pieceLength } from '../curves/piece';
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
    expect(ed.timeline.history.past.at(-1)!.name).toBe('deselect all');
    expect(ed.timeline.history.past.at(-1)!.batch).toBe(ed.timeline.history.past.at(-2)!.batch);
  });

  it('with nothing selected it does nothing, and in draw mode it still finishes the road', () => {
    const ed = road();
    const steps = ed.timeline.history.past.length;
    ed.key('Escape');
    expect(ed.timeline.history.past).toHaveLength(steps);
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
    expect(ed.timeline.history.past.at(-1)!.name).toBe('delete segment');
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

describe('Alt and a right click remove the whole branch (^160)', () => {
  it('the branch between two nodes where branches meet, in one step', () => {
    const ed = draw([
      [0, 0],
      [40, -20],
      [80, 0],
      [120, -20],
    ]);
    ed.key('Escape');
    const m = bareCurvePoint(ed, 1);
    ed.rightClick(at(m.x, m.y, { alt: true }));
    expect(ed.graph.edges).toHaveLength(0);
    expect(ed.graph.nodes).toHaveLength(0);
    expect(ed.timeline.history.past.at(-1)!.name).toBe('delete branch');
  });

  it('a branch ends where another road meets it, and that road stays', () => {
    const ed = road();
    click(ed, 500, 500);
    click(ed, 40, -20);
    click(ed, 40, 30);
    ed.key('Escape');
    const m = bareCurvePoint(ed, 2);
    ed.rightClick(at(m.x, m.y, { alt: true }));
    expect(ed.graph.nodes.length).toBeGreaterThanOrEqual(3);
    expect(ed.graph.edges.length).toBeGreaterThanOrEqual(2);
  });
});

const length = (ed: ReturnType<typeof road>) =>
  ed.chains.reduce(
    (sum, c) =>
      sum + c.edges.reduce((n, e) => n + e.E.pieces.reduce((m, p) => m + pieceLength(p), 0), 0),
    0,
  );

/** Every heading is a half circle from what it was. */
const turned = (ed: ReturnType<typeof road>, before: number[]) =>
  ed.graph.nodes.forEach((n, i) => expect(n.th - Math.PI).toBeCloseTo(before[i]!, 9));

/** Alt and a click on the heading control point. */
const flipAt = (ed: ReturnType<typeof road>, head: { x: number; y: number }) => {
  ed.pointerDown(at(head.x, head.y, { alt: true }));
  ed.pointerUp();
};

describe('Alt and a click on a heading control point flips its arm (^234)', () => {
  it('every edge runs the other way and every heading turns, the curves stay as long as they were', () => {
    const ed = road();
    const [long, th] = [length(ed), ed.graph.nodes.map((n) => n.th)];
    const head = ed.handles(4).find((h) => h.type === 'head')!;
    flipAt(ed, head);
    expect(ed.graph.edges.map((e) => [e.start, e.end])).toEqual([
      [1, 0],
      [2, 1],
    ]);
    turned(ed, th);
    expect(length(ed)).toBeCloseTo(long, 6);
    expect(ed.timeline.history.past.at(-1)!.name).toBe('flip arm');
    ed.key('z', { ctrl: true, shift: false });
    expect(ed.graph.edges.map((e) => [e.start, e.end])).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });
});

describe('the arm that is flipped (^234)', () => {
  it('the arm is everything connected to the node, a branch off it included', () => {
    const ed = road();
    click(ed, 500, 500);
    click(ed, 40, -20);
    click(ed, 40, 30);
    ed.key('Escape');
    const th = ed.graph.nodes.map((n) => n.th);
    const head = ed.handles(4).find((h) => h.type === 'head')!;
    flipAt(ed, head);
    turned(ed, th);
  });

  it('another arm is left alone', () => {
    const ed = road();
    click(ed, 500, 500);
    click(ed, 200, 200);
    click(ed, 230, 220);
    ed.key('Escape');
    const far = ed.graph.nodes.filter((n) => n.x >= 200).map((n) => n.th);
    const head = ed.handles(4).find((h) => h.type === 'head' && h.x < 100)!;
    flipAt(ed, head);
    expect(ed.graph.nodes.filter((n) => n.x >= 200).map((n) => n.th)).toEqual(far);
  });
});

describe('a split on a curve that is finished at once changes nothing (^237)', () => {
  it('the inserted node is not left in the curve, with RMB or Esc', () => {
    for (const finish of [
      (ed: ReturnType<typeof road>) => ed.rightClick(at(300, 300)),
      (ed: ReturnType<typeof road>) => ed.key('Escape'),
    ]) {
      const ed = roadThenDrawMode();
      const [nodes, edges] = [ed.graph.nodes.length, ed.graph.edges.length];
      const m = bareCurvePoint(ed, 0);
      click(ed, m.x, m.y);
      expect(ed.graph.nodes).toHaveLength(nodes + 1);
      finish(ed);
      expect([ed.graph.nodes.length, ed.graph.edges.length]).toEqual([nodes, edges]);
    }
  });

  it('after drawing on, finishing keeps what was drawn', () => {
    const ed = roadThenDrawMode();
    const m = bareCurvePoint(ed, 0);
    click(ed, m.x, m.y);
    click(ed, m.x + 20, m.y + 30);
    ed.key('Escape');
    expect(ed.graph.nodes).toHaveLength(5);
    expect(ed.graph.edges).toHaveLength(4);
  });

  it('a split at an existing node is not touched', () => {
    const ed = roadThenDrawMode();
    const nodes = ed.graph.nodes.length;
    click(ed, 40, -20);
    ed.key('Escape');
    expect(ed.graph.nodes).toHaveLength(nodes);
  });
});

describe('what is under the pointer is looked at again when something changes (^238)', () => {
  it('finishing the road takes the preview away without the pointer moving', () => {
    const ed = draw([
      [0, 0],
      [40, -20],
    ]);
    ed.pointerMove(at(100, 50));
    expect(ed.hover?.kind).toBe('preview');
    ed.key('Escape');
    expect(ed.hover).toBeNull();
    ed.rightClick(at(100, 50));
    expect(ed.hover).toBeNull();
  });

  it('a node that was just placed is hovered at once: its ring and its hints', () => {
    const ed = roadThenDrawMode();
    click(ed, 80, 0); // the end node: the road is extended from it
    ed.pointerMove(at(100, 50));
    click(ed, 100, 50);
    expect(ed.hover?.kind).toBe('handle');
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', type: 'node', act: 'finish' });
    expect(ed.focus).toMatchObject({ type: 'node' });
  });

  it('undo and deleting show what is under the pointer now', () => {
    const ed = road();
    ed.pointerMove(at(40, -20));
    expect(ed.hover?.kind).toBe('handle');
    ed.key('Delete');
    ed.pointerMove(at(40, -20));
    ed.key('z', { ctrl: true, shift: false });
    expect(ed.hover?.kind).toBe('handle');
  });
});

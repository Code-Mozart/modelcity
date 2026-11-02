import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at, click, draw, roadDrawn, roadThenDrawMode } from '../testing/editorHelpers';

const road = (): [number, number][] => [
  [0, 0],
  [20, -10],
  [40, 0],
];

describe('entering draw mode (^48, ^54)', () => {
  it('the first click only enters draw mode; the second places the first node', () => {
    const ed = new Editor();
    click(ed, 10, 10);
    expect(ed.drawing).toBe(true);
    expect(ed.chains).toEqual([]);
    expect(ed.cursor).toBe('crosshair');
    ed.pointerMove(at(30, 5));
    expect(ed.hover).toMatchObject({ kind: 'preview', ref: null, node: { x: 30, y: 5, th: 0 } });
    click(ed, 30, 5);
    expect(ed.chains[0]!.path.nodes).toMatchObject([{ x: 30, y: 5, th: 0 }]);
    expect(roadDrawn(ed)).toBe(0);
  });

  it('a drag in select mode does not enter draw mode, it is reserved for a rubber band', () => {
    const ed = new Editor();
    ed.pointerDown(at(10, 10));
    ed.pointerMove(at(40, 30));
    ed.pointerUp();
    expect(ed.drawing).toBe(false);
    expect(ed.chains).toEqual([]);
  });
});

describe('leaving draw mode early (^54)', () => {
  it('Esc or a right click leave draw mode before any node is placed', () => {
    const ed = new Editor();
    click(ed, 10, 10);
    ed.key('Escape');
    expect(ed.drawing).toBe(false);
    click(ed, 10, 10);
    ed.rightClick(at(50, 50));
    expect(ed.drawing).toBe(false);
    expect(ed.chains).toEqual([]);
  });

  it('a second finger after the first click changes nothing', () => {
    const ed = new Editor();
    ed.pointerDown(at(10, 10));
    ed.cancelPress();
    ed.pointerUp();
    expect(ed.drawing).toBe(false);
  });

  it('remembers where the pointer is, until it leaves', () => {
    const ed = new Editor();
    ed.pointerMove(at(5, 6, { scale: 8 }));
    expect(ed.pointer).toEqual({ pt: { x: 5, y: 6 }, scale: 8 });
    ed.pointerLeave();
    expect(ed.pointer).toBeNull();
  });
});

describe('select mode and draw mode (^48)', () => {
  it('Esc, a right click or the last node leave draw mode', () => {
    const ed = draw([[0, 0]]);
    expect(ed.drawing).toBe(true);
    click(ed, 20, -10);
    ed.key('Escape');
    expect(ed.drawing).toBe(false);
    click(ed, 100, 100);
    expect(ed.drawing).toBe(true);
    ed.rightClick(at(200, 200));
    expect(ed.drawing).toBe(false);
  });

  it('shows a crosshair and the node preview only in draw mode', () => {
    const ed = draw([[0, 0]]);
    ed.pointerMove(at(60, 60));
    expect(ed.hover?.kind).toBe('preview');
    expect(ed.cursor).toBe('crosshair');
    ed.key('Escape');
    ed.pointerMove(at(60, 60));
    expect(ed.hover).toBeNull();
    expect(ed.cursor).toBe('default');
  });

  it('editing a handle in select mode does not enter draw mode', () => {
    const ed = draw(road());
    ed.key('Escape');
    ed.pointerDown(at(20, -10));
    ed.pointerMove(at(24, -14));
    ed.pointerUp();
    expect(ed.chains[0]!.path.nodes[1]).toMatchObject({ x: 24, y: -14 });
    expect(ed.drawing).toBe(false);
  });
});

describe('hovering handles in both modes (^48)', () => {
  it('highlights a hovered handle in both modes', () => {
    const ed = draw(road());
    ed.pointerMove(at(20, -10));
    expect(ed.hover?.kind).toBe('handle');
    ed.key('Escape');
    ed.pointerMove(at(20, -10));
    expect(ed.hover?.kind).toBe('handle');
    expect(ed.cursor).toBe('grab');
  });
});

describe('focus: what is hovered or dragged (^51)', () => {
  it('is nothing when the pointer is over empty canvas', () => {
    const ed = draw(road());
    ed.pointerMove(at(80, 80));
    expect(ed.focus).toBeNull();
  });

  it('is the hovered handle, and stays on it while it is dragged', () => {
    const ed = draw(road());
    ed.key('Escape');
    ed.pointerMove(at(20, -10));
    expect(ed.focus).toEqual({ road: 0, type: 'node', i: 1 });
    ed.pointerDown(at(20, -10));
    ed.pointerMove(at(24, -14));
    expect(ed.hover).toBeNull();
    expect(ed.focus).toEqual({ road: 0, type: 'node', i: 1 });
    ed.pointerUp();
    // The node is under the pointer when the button is released, so it is hovered again at once.
    expect(ed.focus).toEqual({ road: 0, type: 'node', i: 1 });
    ed.pointerMove(at(200, 200));
    expect(ed.focus).toBeNull();
  });

  it('is the node being placed while its heading is dragged', () => {
    const ed = draw([[0, 0]]);
    ed.pointerDown(at(30, 10));
    ed.pointerMove(at(50, 10));
    expect(ed.focus).toEqual({ road: 0, type: 'node', i: 1 });
  });
});

describe('hint target for the control hints (^49)', () => {
  it('describes what is under the pointer, and stays while the button is down', () => {
    const ed = draw(road());
    // The node that was just placed is under the pointer: it is what the hints are about (^237).
    expect(ed.hintTarget).toMatchObject({ kind: 'handle', type: 'node', act: 'finish' });
    ed.pointerMove(at(200, 200));
    expect(ed.hintTarget).toEqual({ kind: 'empty' });
    ed.pointerMove(at(40, 0));
    expect(ed.hintTarget).toEqual({
      kind: 'handle',
      type: 'node',
      act: 'finish',
      selected: true,
      lane: false,
    });
    const middle = { kind: 'handle', type: 'node', act: 'merge', selected: false, lane: false };
    ed.pointerMove(at(20, -10));
    expect(ed.hintTarget).toEqual(middle);
    ed.pointerDown(at(20, -10));
    ed.pointerMove(at(80, 80));
    expect(ed.hintTarget).toEqual(middle);
  });

  it('has no click action in select mode', () => {
    const ed = draw(road());
    ed.key('Escape');
    ed.pointerMove(at(40, 0));
    expect(ed.hintTarget).toEqual({
      kind: 'handle',
      type: 'node',
      act: null,
      selected: false,
      lane: false,
    });
  });
});

describe('the three modes (^120)', () => {
  it('select, draw and extend follow what is being drawn', () => {
    const ed = new Editor();
    expect(ed.phase).toBe('select');
    click(ed, 10, 10);
    expect(ed.phase).toBe('draw');
    click(ed, 10, 10);
    expect(ed.phase).toBe('extend');
  });

  it('finishing a road goes back to draw mode, a second right click to select mode', () => {
    const ed = draw(road());
    ed.rightClick(at(80, 80));
    expect(ed.phase).toBe('draw');
    ed.rightClick(at(80, 80));
    expect(ed.phase).toBe('select');
  });

  it('a click on the void in draw mode starts the next road at once', () => {
    const ed = draw(road());
    ed.rightClick(at(80, 80));
    click(ed, 100, 100);
    expect(ed.phase).toBe('extend');
    expect(ed.chains).toHaveLength(2);
  });

  it('Esc always jumps straight to select mode', () => {
    const ed = draw(road());
    ed.key('Escape');
    expect(ed.phase).toBe('select');
    click(ed, 10, 10);
    ed.key('Escape');
    expect(ed.phase).toBe('select');
  });
});

describe('view mode (^104)', () => {
  const tab = (ed: Editor) => ed.key('Tab');

  it('Tab goes to view mode from every mode, and back to select mode', () => {
    for (const make of [() => new Editor(), () => draw([[0, 0]]), () => draw(road())]) {
      const ed = make();
      expect(tab(ed)).toBe(true);
      expect(ed.phase).toBe('view');
      tab(ed);
      expect(ed.phase).toBe('select');
    }
  });

  it('the road being drawn is finished when entering view mode', () => {
    const ed = draw(road());
    tab(ed);
    expect(ed.active).toBeNull();
    expect(ed.chains).toHaveLength(1);
    expect(ed.chains[0]!.path.nodes).toHaveLength(3);
  });
});

describe('what view mode leaves alone (^104)', () => {
  const tab = (ed: Editor) => ed.key('Tab');

  it('nothing can be edited, selected or hovered in view mode', () => {
    const ed = roadThenDrawMode();
    tab(ed);
    const before = ed.graph;
    click(ed, 0, 0);
    click(ed, 300, 300);
    ed.rightClick(at(0, 0));
    ed.key('Delete');
    ed.key('z', { ctrl: true, shift: false });
    ed.key('Escape');
    expect(ed.graph).toBe(before);
    expect(ed.selection).toEqual([]);
    expect(ed.hover).toBeNull();
    expect(ed.phase).toBe('view');
  });

  it('leaving view mode gives back the editing, with the selection that was there', () => {
    const ed = roadThenDrawMode();
    ed.key('Escape');
    click(ed, 0, 0);
    const selected = ed.selection;
    tab(ed);
    tab(ed);
    expect(ed.selection).toEqual(selected);
    expect(ed.hover).toMatchObject({ kind: 'handle' });
  });
});

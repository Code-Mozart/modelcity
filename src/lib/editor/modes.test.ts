import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { at, click, draw, roadDrawn } from '../testing/editorHelpers';

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

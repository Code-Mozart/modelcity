import { describe, expect, it } from 'vitest';
import { at, click, draw } from './testing/editorHelpers';

const road = (): [number, number][] => [
  [0, 0],
  [20, -10],
  [40, 0],
];

describe('select mode and draw mode (^48)', () => {
  it('a click on empty canvas enters draw mode; Esc, a right click or the last node leave it', () => {
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
    expect(ed.hover?.kind).toBe('ghost');
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
    expect(ed.roads[0]!.nodes[1]).toMatchObject({ x: 24, y: -14 });
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
    expect(ed.hintTarget).toEqual({ kind: 'handle', type: 'node', last: true });
    ed.pointerMove(at(20, -10));
    expect(ed.hintTarget).toEqual({ kind: 'handle', type: 'node', last: false });
    ed.pointerDown(at(20, -10));
    ed.pointerMove(at(80, 80));
    expect(ed.hintTarget).toEqual({ kind: 'handle', type: 'node', last: false });
  });

  it('is not "last" in select mode', () => {
    const ed = draw(road());
    ed.key('Escape');
    ed.pointerMove(at(40, 0));
    expect(ed.hintTarget).toEqual({ kind: 'handle', type: 'node', last: false });
  });
});

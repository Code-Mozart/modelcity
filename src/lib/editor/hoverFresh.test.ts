import { describe, expect, it } from 'vitest';
import { at, bareCurvePoint, click, draw } from '../testing/editorHelpers';
import { Editor } from './editor.svelte';
import type { PointerInfo } from './types';

/** What the pointer is over, looked at from scratch: as if the pointer had just moved there. */
const fresh = (ed: Editor, info: PointerInfo) => {
  const [hover, target, cursor, focus] = [ed.hover, ed.hintTarget, ed.cursor, ed.focus];
  ed.pointerMove(info);
  return {
    was: { hover, target, cursor, focus },
    is: { hover: ed.hover, target: ed.hintTarget, cursor: ed.cursor, focus: ed.focus },
  };
};

/** A small seeded random generator, so that a failing run can be repeated. */
const random = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const spots: [number, number][] = [
  [0, 0],
  [40, -20],
  [80, 0],
  [120, -20],
  [20, -12],
  [60, -10],
  [200, 100],
];

const spot = (rnd: () => number, n = spots.length) => spots[Math.floor(rnd() * n)]!;

/** An operation, and where it leaves the pointer (none: where it was). */
type Operation = (ed: Editor, rnd: () => number, now: PointerInfo) => PointerInfo | boolean | void;

/** Operations that change what is under the pointer, with or without moving it. */
const operations: [string, Operation][] = [
  ['Tab', (ed) => ed.key('Tab')],
  ['Escape', (ed) => ed.key('Escape')],
  ['Delete', (ed) => ed.key('Delete')],
  ['undo', (ed) => ed.key('z', { ctrl: true, shift: false })],
  ['redo', (ed) => ed.key('y', { ctrl: true, shift: false })],
  ['batch undo', (ed) => ed.key('z', { ctrl: true, shift: false, alt: true })],
  ['enter draw mode', (ed) => ed.enterDrawMode()],
  ['finish road', (ed) => ed.finishRoad()],
  [
    'snapping on',
    (ed, _rnd, now) => {
      ed.modifiers({ alt: now.alt, shift: now.shift, ctrl: false });
      return { ...now, ctrl: false };
    },
  ],
  [
    'snapping off',
    (ed, _rnd, now) => {
      ed.modifiers({ alt: now.alt, shift: now.shift, ctrl: true });
      return { ...now, ctrl: true };
    },
  ],
  ['pin', (ed) => ed.key('s')],
  [
    'Alt down',
    (ed, _rnd, now) => {
      ed.modifiers({ alt: true, shift: false });
      return { ...now, alt: true };
    },
  ],
  [
    'Alt up',
    (ed, _rnd, now) => {
      ed.modifiers({ alt: false, shift: false });
      return { ...now, alt: false };
    },
  ],
  [
    'click',
    (ed, rnd) => {
      const [x, y] = spot(rnd);
      click(ed, x, y);
      return at(x, y);
    },
  ],
  [
    'right click',
    (ed, rnd) => {
      const [x, y] = spot(rnd);
      ed.pointerMove(at(x, y)); // the pointer is there before it clicks
      ed.rightClick(at(x, y));
      return at(x, y);
    },
  ],
  [
    'box',
    (ed) => {
      ed.pointerDown(at(-20, -40));
      ed.pointerMove(at(150, 30));
      ed.pointerUp();
      return at(150, 30);
    },
  ],
  [
    'drag a node',
    (ed, rnd) => {
      const [x, y] = spot(rnd, 4);
      ed.pointerDown(at(x, y));
      ed.pointerMove(at(x + 9, y + 5));
      ed.pointerUp();
      return at(x + 9, y + 5);
    },
  ],
];

describe('what is under the pointer is always right (^238)', () => {
  it('after any operation it is what a fresh look at the pointer gives', () => {
    const rnd = random(7);
    for (let run = 0; run < 40; run++) {
      const ed = draw([
        [0, 0],
        [40, -20],
        [80, 0],
        [120, -20],
      ]);
      ed.key('Escape');
      let info = at(...spot(rnd));
      ed.pointerMove(info);
      for (let step = 0; step < 14; step++) {
        const [name, op] = operations[Math.floor(rnd() * operations.length)]!;
        const moved = op(ed, rnd, info);
        if (moved && typeof moved === 'object') info = moved;
        const { was, is } = fresh(ed, info);
        expect(was, `run ${run} step ${step} after ${name}`).toEqual(is);
      }
    }
  });
});

describe('the hovered branch follows Alt without a mouse move (^99, ^238)', () => {
  it('Alt down and up change the outline, the pointer does not move', () => {
    const ed = draw([
      [0, 0],
      [40, -20],
      [80, 0],
      [120, -20],
    ]);
    ed.key('Escape');
    const m = bareCurvePoint(ed, 1);
    ed.pointerMove(at(m.x, m.y));
    expect(ed.hoverSegments).toHaveLength(1);
    ed.modifiers({ alt: true, shift: false });
    expect(ed.hoverSegments.length).toBeGreaterThan(1);
    ed.modifiers({ alt: false, shift: false });
    expect(ed.hoverSegments).toHaveLength(1);
  });

  it('the view moving under a still pointer is looked at again', () => {
    const ed = draw([
      [0, 0],
      [40, -20],
      [80, 0],
    ]);
    ed.key('Escape');
    const m = bareCurvePoint(ed, 0);
    ed.pointerMove(at(m.x, m.y));
    expect(ed.hover?.kind).toBe('candidate');
    ed.look(at(300, 300)); // the view moved: the same screen spot is empty canvas now
    expect(ed.hover).toBeNull();
  });
});

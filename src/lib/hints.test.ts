import { describe, expect, it } from 'vitest';
import { hintsFor, type Hint, type HintTarget } from './hints';

/** A readable form of a hint: "LMB drag: pan". */
const show = (h: Hint) =>
  `${h.inputs
    .map((i) =>
      i.kind === 'key'
        ? i.label
        : i.kind === 'wheel'
          ? 'Wheel'
          : `${i.button.toUpperCase()}${i.drag ? ' drag' : ''}`,
    )
    .join(' or ')}: ${h.text}`;
const rows = (drawing: boolean, target: HintTarget) => hintsFor(drawing, target).map(show);

const empty: HintTarget = { kind: 'empty' };
const node = (last: boolean): HintTarget => ({ kind: 'handle', type: 'node', last });

describe('control hints (^49)', () => {
  it('select mode shows how to enter draw mode and the camera controls', () => {
    expect(rows(false, empty)).toEqual([
      'LMB: draw mode',
      'RMB drag: pan',
      'Wheel: zoom',
      'MMB drag: rotate',
    ]);
    expect(rows(false, { kind: 'curve' })).toEqual(rows(false, empty));
  });

  it('draw mode on empty canvas: add a node, with a heading, or finish', () => {
    expect(rows(true, empty)).toEqual([
      'LMB: add node',
      'LMB drag: add node with heading',
      'Esc or RMB: finish',
    ]);
  });

  it('draw mode over a curve: insert a node', () => {
    expect(rows(true, { kind: 'curve' })).toEqual([
      'LMB: insert node',
      'LMB drag: insert node with heading',
      'Esc or RMB: finish',
    ]);
  });

  it('over a node a right click deletes it, so only Esc finishes', () => {
    expect(rows(true, node(false))).toEqual([
      'LMB drag: move node',
      'RMB: delete node',
      'Esc: finish',
    ]);
  });
});

describe('control hints over nodes and handles (^49)', () => {
  it('over the last node a click finishes the road', () => {
    expect(rows(true, node(true))).toEqual([
      'LMB: finish road',
      'LMB drag: move node',
      'RMB: delete node',
      'Esc: finish',
    ]);
  });

  it('over other handles: what dragging does, and both ways to finish', () => {
    const h = (type: 'head' | 'ctrl' | 'rad'): HintTarget => ({
      kind: 'handle',
      type,
      last: false,
    });
    expect(rows(true, h('head'))).toEqual(['LMB drag: turn heading', 'Esc or RMB: finish']);
    expect(rows(true, h('ctrl'))).toEqual(['LMB drag: bend curve', 'Esc or RMB: finish']);
    expect(rows(true, h('rad'))).toEqual(['LMB drag: change radius', 'Esc or RMB: finish']);
  });

  it('select mode over a node: move or delete it, plus the camera controls', () => {
    expect(rows(false, node(false))).toEqual([
      'LMB drag: move node',
      'RMB: delete node',
      'RMB drag: pan',
      'Wheel: zoom',
      'MMB drag: rotate',
    ]);
  });
});

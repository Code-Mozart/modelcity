import { describe, expect, it } from 'vitest';
import { dialogHints, hintsFor, type Hint, type HintTarget } from './hints';

/** A readable form of a hint: "LMB drag: pan". */
const show = (h: Hint) =>
  `${h.inputs
    .map((i) =>
      i.kind === 'key'
        ? i.label
        : i.kind === 'keys'
          ? i.labels.join('+')
          : i.kind === 'wheel'
            ? 'Wheel'
            : `${i.shift ? 'Shift+' : i.alt ? 'Alt+' : ''}${i.button.toUpperCase()}${i.drag ? ' drag' : ''}`,
    )
    .join(' or ')}: ${h.text}`;
const PROJECT_ROWS = ['Ctrl+S: export', 'Ctrl+O: projects'];
/** The hints of the mode and target, without the project controls that are always shown (^168). */
const rows = (drawing: boolean, target: HintTarget, selected = 0) =>
  hintsFor(drawing, target, selected)
    .map(show)
    .filter((r) => !PROJECT_ROWS.includes(r));

const empty: HintTarget = { kind: 'empty' };
const node = (last: boolean, leaf = last): HintTarget => ({
  kind: 'handle',
  type: 'node',
  act: last ? 'finish' : leaf ? 'extend' : null,
});

describe('control hints (^49)', () => {
  it('draw mode on empty canvas: add a node, with a heading, or finish', () => {
    expect(rows(true, empty)).toEqual([
      'LMB: add node',
      'LMB drag: add node and set heading',
      'Esc or RMB: finish',
    ]);
  });

  it('draw mode over a curve: insert a node', () => {
    expect(rows(true, { kind: 'curve' })).toEqual([
      'LMB: insert here',
      'LMB drag: insert and set heading',
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
      'LMB: finish',
      'LMB drag: move node',
      'RMB: delete node',
      'Esc: finish',
    ]);
  });

  it('over another leaf node a click extends the road from it (^65)', () => {
    expect(rows(true, node(false, true))).toEqual([
      'LMB: extend',
      'LMB drag: move node',
      'RMB: delete node',
      'Esc: finish',
    ]);
  });

  it('over other handles: what dragging does, and both ways to finish', () => {
    const h = (type: 'head' | 'ctrl' | 'rad'): HintTarget => ({
      kind: 'handle',
      type,
      act: null,
    });
    expect(rows(true, h('head'))).toEqual(['LMB drag: turn heading', 'Esc or RMB: finish']);
    expect(rows(true, h('ctrl'))).toEqual(['LMB drag: bend curve', 'Esc or RMB: finish']);
    expect(rows(true, h('rad'))).toEqual(['LMB drag: change radius', 'Esc or RMB: finish']);
  });
});

describe('select mode hints (^49, ^74)', () => {
  it('select mode shows how to enter draw mode, the box and the camera controls', () => {
    expect(rows(false, empty)).toEqual([
      'LMB: draw mode',
      'LMB drag: select',
      'RMB drag: pan',
      'Wheel: zoom',
      'MMB drag: rotate',
    ]);
  });

  it('select mode with a selection: add to it, delete it (^74)', () => {
    expect(rows(false, empty, 2)).toEqual([
      'LMB: deselect all',
      'LMB drag: select',
      'Shift+LMB drag: add to selection',
      'Del: delete selected',
      'RMB drag: pan',
      'Wheel: zoom',
      'MMB drag: rotate',
    ]);
  });
});

describe('select mode hints over curves and nodes (^74)', () => {
  it('select mode over a curve: select both its nodes, or deselect them (^74)', () => {
    const camera = ['RMB drag: pan', 'Wheel: zoom', 'MMB drag: rotate'];
    expect(rows(false, { kind: 'curve', picked: 1 }, 1)).toEqual([
      'LMB drag: select',
      'Shift+LMB drag: add to selection',
      'LMB: select both nodes instead',
      'Shift+LMB: add both nodes to selection',
      'Alt+LMB: select lane',
      'Del: delete selected',
      ...camera,
    ]);
    expect(rows(false, { kind: 'curve', picked: 2 }, 2)).toEqual([
      'LMB drag: select',
      'Shift+LMB drag: add to selection',
      'Shift+LMB: deselect both nodes',
      'Alt+LMB: select lane',
      'Del: delete selected',
      ...camera,
    ]);
  });
});

describe('select mode hints over nodes (^74, ^75)', () => {
  it('select mode over a node: move, delete, select or deselect it, plus the camera controls', () => {
    expect(rows(false, node(false))).toEqual([
      'LMB drag: move node',
      'RMB: delete node',
      'LMB: select',
      'Alt+LMB: select lane',
      'RMB drag: pan',
      'Wheel: zoom',
      'MMB drag: rotate',
    ]);
    expect(rows(false, node(false), 1).slice(2, 5)).toEqual([
      'LMB: select instead',
      'Shift+LMB: select',
      'Alt+LMB: select lane',
    ]);
    const selected: HintTarget = { ...node(false), selected: true } as HintTarget;
    expect(rows(false, selected, 1).slice(2)).toEqual([
      'Shift+LMB: deselect',
      'Alt+LMB: select lane',
      'Del: delete selected',
      'RMB drag: pan',
      'Wheel: zoom',
      'MMB drag: rotate',
    ]);
  });
});

describe('undo and redo hints (^81)', () => {
  it('come first, and only for what can be undone or redone', () => {
    expect(rows(false, empty).some((r) => r.includes('undo'))).toBe(false);
    expect(hintsFor(false, empty, 0, { undo: true, redo: false }).map(show)[0]).toBe(
      'Ctrl+Z: undo',
    );
    expect(hintsFor(true, empty, 0, { undo: false, redo: true }).map(show)[0]).toBe(
      'Ctrl+Y or Ctrl+Shift+Z: redo',
    );
    expect(hintsFor(true, empty, 0, { undo: true, redo: true }).map(show).slice(0, 2)).toEqual([
      'Ctrl+Z: undo',
      'Ctrl+Y or Ctrl+Shift+Z: redo',
    ]);
  });
});

describe('split and merge hints (^23)', () => {
  const act = (a: 'split' | 'merge'): HintTarget => ({ kind: 'handle', type: 'node', act: a });

  it('over a node: split a road off it, or merge the road being drawn into it', () => {
    expect(rows(true, act('split'))[0]).toBe('LMB: split');
    expect(rows(true, act('merge'))[0]).toBe('LMB: merge');
  });

  it('over a curve: split here, merge here, or insert a node', () => {
    const curve = (a: 'split' | 'merge' | 'insert'): HintTarget => ({ kind: 'curve', act: a });
    expect(rows(true, curve('split'))[0]).toBe('LMB: split');
    expect(rows(true, curve('merge'))[1]).toBe('LMB drag: insert and set heading');
    expect(rows(true, curve('insert'))[0]).toBe('LMB: insert here');
  });
});

describe('project controls (^168)', () => {
  it('are always the last hints, in every mode', () => {
    for (const drawing of [false, true]) {
      expect(hintsFor(drawing, empty).map(show).slice(-2)).toEqual(PROJECT_ROWS);
    }
  });
});

describe('the projects dialog hints say what an input does right now (^181)', () => {
  const rows = (...args: Parameters<typeof dialogHints>) => dialogHints(...args).map(show);

  it('only Esc over nothing, and the click only over something that can be clicked', () => {
    expect(rows('list')).toEqual(['Esc: close']);
    expect(rows('list', 'card')).toEqual(['LMB: open project', 'Esc: close']);
    expect(rows('list', 'rename')).toEqual(['LMB: rename', 'Esc: close']);
    expect(rows('list', 'delete')).toEqual(['LMB: delete', 'Esc: close']);
  });

  it('while renaming: Enter renames, Esc cancels, the check mark renames, the cross cancels', () => {
    expect(rows('rename')).toEqual(['Enter: rename', 'Esc: cancel renaming']);
    expect(rows('rename', 'confirm')).toEqual([
      'LMB: rename',
      'Enter: rename',
      'Esc: cancel renaming',
    ]);
    expect(rows('rename', 'cancel')[0]).toBe('LMB: cancel');
  });

  it('while asked about a delete: the check mark deletes, the cross and Esc cancel', () => {
    expect(rows('delete', 'confirm')).toEqual(['LMB: delete for good', 'Esc: cancel deleting']);
    expect(rows('delete', 'cancel')).toEqual(['LMB: cancel', 'Esc: cancel deleting']);
  });
});

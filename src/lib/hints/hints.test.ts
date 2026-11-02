import { describe, expect, it } from 'vitest';
import { modalHints } from '../project/modalHints';
import { hintsFor, historyHints, type Hint, type HintTarget } from './hints';

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
    .join(' or ')}: ${h.text}${h.note ? ` (${h.note.key} ${h.note.text})` : ''}`;
const PROJECT_ROWS = ['Ctrl+S: save', 'P or Ctrl+O: projects'];
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

  it('draw mode over a curve: merge into it, or insert a node with a drag', () => {
    expect(rows(true, { kind: 'curve', act: 'merge' })).toEqual([
      'LMB: merge',
      'LMB drag: insert and set heading',
      'Esc: finish',
      'RMB: remove segment',
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
      'Esc: deselect all',
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
      'Esc: deselect all',
      'Del: delete selected',
      'RMB: remove segment',
      ...camera,
    ]);
    expect(rows(false, { kind: 'curve', picked: 2 }, 2)).toEqual([
      'LMB drag: select',
      'Shift+LMB drag: add to selection',
      'Shift+LMB: deselect both nodes',
      'Alt+LMB: select lane',
      'Esc: deselect all',
      'Del: delete selected',
      'RMB: remove segment',
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
      'Esc: deselect all',
      'Del: delete selected',
      'RMB drag: pan',
      'Wheel: zoom',
      'MMB drag: rotate',
    ]);
  });
});

describe('undo and redo hints (^81, ^103, ^109)', () => {
  const history = (undo: boolean, redo: boolean) => historyHints({ undo, redo }).map(show);

  it('are not among the control hints; they belong to the recent history panel', () => {
    expect(rows(false, empty).some((r) => r.includes('undo'))).toBe(false);
  });

  it('only for what can be undone or redone; holding Alt does it by batch', () => {
    expect(history(false, false)).toEqual([]);
    expect(history(true, false)).toEqual(['Ctrl+Z: undo (Alt to undo batch)']);
    expect(history(false, true)).toEqual(['Ctrl+Y or Ctrl+Shift+Z: redo (Alt to redo batch)']);
    expect(history(true, true)).toHaveLength(2);
  });
});

describe('split and merge hints (^23)', () => {
  const act = (a: 'split' | 'merge'): HintTarget => ({ kind: 'handle', type: 'node', act: a });

  it('over a node: split a road off it, or merge the road being drawn into it', () => {
    expect(rows(true, act('split'))[0]).toBe('LMB: split');
    expect(rows(true, act('merge'))[0]).toBe('LMB: merge');
  });

  it('over a curve: split or merge, also into the road being drawn (^191)', () => {
    const curve = (a: 'split' | 'merge'): HintTarget => ({ kind: 'curve', act: a });
    expect(rows(true, curve('split'))[0]).toBe('LMB: split');
    expect(rows(true, curve('merge'))[1]).toBe('LMB drag: insert and set heading');
    expect(rows(true, curve('merge'))[0]).toBe('LMB: merge');
  });
});

describe('project controls (^168)', () => {
  it('are always the last hints, in every mode', () => {
    for (const drawing of [false, true]) {
      expect(hintsFor(drawing, empty).map(show).slice(-2)).toEqual(PROJECT_ROWS);
    }
  });
});

describe('the projects modal hints say what an input does right now (^181)', () => {
  const rows = (...args: Parameters<typeof modalHints>) => modalHints(...args).map(show);

  it('only Esc over nothing, and the click only over something that can be clicked', () => {
    expect(rows('list')).toEqual(['Esc: close']);
    expect(rows('list', 'card')).toEqual(['LMB: open', 'Esc: close']);
    expect(rows('list', 'rename')).toEqual(['LMB: rename', 'Esc: close']);
    expect(rows('list', 'delete')).toEqual(['LMB: delete', 'Esc: close']);
    expect(rows('list', 'export')).toEqual(['LMB: export JSON', 'Esc: close']);
  });

  it('inputs that do the same are one row: Esc or LMB closes over the cross', () => {
    expect(rows('list', 'close')).toEqual(['Esc or LMB: close']);
  });

  it('while renaming: the check mark and Enter rename, the cross and Esc cancel', () => {
    expect(rows('rename')).toEqual(['Enter: rename', 'Esc: cancel']);
    expect(rows('rename', 'confirm')).toEqual(['Enter or LMB: rename', 'Esc: cancel']);
    expect(rows('rename', 'cancel')).toEqual(['Esc or LMB: cancel', 'Enter: rename']);
  });

  it('while asked about a delete: the check mark deletes, the cross and Esc cancel', () => {
    expect(rows('delete', 'confirm')).toEqual(['LMB: delete', 'Esc: cancel']);
    expect(rows('delete', 'cancel')).toEqual(['Esc or LMB: cancel']);
  });
});

describe('learned controls are hidden (^110)', () => {
  const hiddenIds =
    (...ids: string[]) =>
    (id: string) =>
      ids.includes(id);

  it('a control that was used has no hint, each on its own', () => {
    const all = rows(false, empty, 2);
    const some = hintsFor(false, empty, 2, hiddenIds('pan', 'select-box')).map(show);
    expect(all).toContain('RMB drag: pan');
    expect(some).not.toContain('RMB drag: pan');
    expect(some).not.toContain('LMB drag: select');
    expect(some).toContain('Wheel: zoom');
    expect(some).toContain('MMB drag: rotate');
  });

  it('with the camera and select controls learned, drawing is the only mouse hint on a blank map', () => {
    const learned = hiddenIds('pan', 'zoom', 'rotate', 'select-box');
    expect(hintsFor(false, empty, 0, learned).map(show)).toEqual([
      'LMB: draw mode',
      ...PROJECT_ROWS,
    ]);
  });

  it('draw mode and moving are not hidden', () => {
    const all = () => true;
    expect(hintsFor(true, empty, 0, all).map(show)).toEqual(hintsFor(true, empty, 0).map(show));
    expect(hintsFor(false, node(false), 0, all).map(show)).toContain('LMB drag: move node');
  });

  it('undo and redo can be learned, too', () => {
    const rowsOf = (...ids: string[]) =>
      historyHints({ undo: true, redo: true }, hiddenIds(...ids)).map(show);
    expect(rowsOf()).toHaveLength(2);
    expect(rowsOf('undo')).toEqual(['Ctrl+Y or Ctrl+Shift+Z: redo (Alt to redo batch)']);
  });
});

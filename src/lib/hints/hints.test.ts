import { describe, expect, it } from 'vitest';
import { modalHints } from '../project/modalHints';
import { node, show } from '../testing/hintHelpers';
import { hintsFor, historyHints, viewHints, type HintTarget } from './hints';

/** A readable form of a hint: "LMB drag: pan". */
const PROJECT_ROWS = ['P: projects'];
/** The hints of the mode and target, without the Tab and project controls that are always shown (^104, ^168). */
const rows = (drawing: boolean, target: HintTarget, selected = 0) =>
  hintsFor(drawing, target, selected)
    .map(show)
    .filter((r) => !PROJECT_ROWS.includes(r) && r !== 'Tab: view mode' && !r.startsWith('S: '));

const hiddenIds =
  (...ids: string[]) =>
  (id: string) =>
    ids.includes(id);

const empty: HintTarget = { kind: 'empty' };
/** The camera rows, shown in every mode (^389). */
const CAMERA = ['RMB drag: pan', 'Wheel: zoom', 'MMB drag: rotate'];

describe('control hints (^49)', () => {
  it('draw mode on empty canvas: add a node, with a heading, or finish', () => {
    expect(rows(true, empty)).toEqual([
      'LMB: place node',
      'LMB drag: place node and set heading',
      'Esc or RMB: finish',
      ...CAMERA,
    ]);
  });

  it('draw mode over a curve: merge into it, or insert a node with a drag', () => {
    expect(rows(true, { kind: 'curve', act: 'merge' })).toEqual([
      'LMB: merge',
      'LMB drag: insert and set heading',
      'Esc: finish',
      'RMB: remove segment',
      'Alt+RMB: remove branch',
      ...CAMERA,
    ]);
  });

  it('over a node a right click deletes it, so only Esc finishes', () => {
    expect(rows(true, node(false))).toEqual([
      'LMB drag: move node',
      'RMB: delete node',
      'Esc: finish',
      ...CAMERA,
    ]);
  });
});

describe('control hints over nodes and handles (^49)', () => {
  it('over the last node a click finishes the road', () => {
    // One row for both ways to finish, not two (^239).
    expect(rows(true, node(true))).toEqual([
      'LMB or Esc: finish',
      'LMB drag: move node',
      'RMB: delete node',
      ...CAMERA,
    ]);
  });

  it('over another leaf node a click extends the road from it (^65)', () => {
    expect(rows(true, node(false, true))).toEqual([
      'LMB: extend',
      'Alt+LMB: extend from end',
      'LMB drag: move node',
      'RMB: delete node',
      'Esc: finish',
      ...CAMERA,
    ]);
  });
});

describe('control hints over the other handles (^49)', () => {
  it('what dragging does, and both ways to finish', () => {
    const h = (type: 'head' | 'ctrl' | 'rad'): HintTarget => ({
      kind: 'handle',
      type,
      act: null,
    });
    expect(rows(true, h('head'))).toEqual([
      'LMB drag: turn heading',
      'Alt+LMB: flip arm',
      'Esc or RMB: finish',
      ...CAMERA,
    ]);
    expect(rows(true, h('ctrl'))).toEqual([
      'LMB drag: bend curve',
      'Esc or RMB: finish',
      ...CAMERA,
    ]);
    expect(rows(true, h('rad'))).toEqual([
      'LMB drag: change radius',
      'Esc or RMB: finish',
      ...CAMERA,
    ]);
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
      'LMB: select segment instead',
      'Shift+LMB: add segment to selection',
      'Alt+LMB: select branch',
      'Alt+Shift+LMB: add branch to selection',
      'Esc: deselect all',
      'Del: delete selected',
      'RMB: remove segment',
      'Alt+RMB: remove branch',
      ...camera,
    ]);
    expect(rows(false, { kind: 'curve', picked: 2 }, 2)).toEqual([
      'LMB drag: select',
      'Shift+LMB drag: add to selection',
      'Shift+LMB: deselect segment',
      'Alt+LMB: select branch',
      'Alt+Shift+LMB: add branch to selection',
      'Esc: deselect all',
      'Del: delete selected',
      'RMB: remove segment',
      'Alt+RMB: remove branch',
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
      'Alt+LMB: select branch',
      'Del: delete node',
      'RMB drag: pan',
      'Wheel: zoom',
      'MMB drag: rotate',
    ]);
    expect(rows(false, node(false), 1).slice(2, 6)).toEqual([
      'LMB: select instead',
      'Shift+LMB: select',
      'Alt+LMB: select branch',
      'Alt+Shift+LMB: add branch to selection',
    ]);
    const selected: HintTarget = { ...node(false), selected: true } as HintTarget;
    expect(rows(false, selected, 1).slice(2)).toEqual([
      'Shift+LMB: deselect',
      'Alt+LMB: select branch',
      'Alt+Shift+LMB: add branch to selection',
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
    expect(history(true, false)).toEqual(['Ctrl+Z: undo']);
    expect(history(false, true)).toEqual(['Ctrl+Y or Ctrl+Shift+Z: redo']);
    expect(history(true, true)).toHaveLength(2);
  });

  it('the Alt note is there only when the step belongs to a batch of more than one (^418)', () => {
    const batched = (undoBatch: boolean, redoBatch: boolean) =>
      historyHints({ undo: true, redo: true, undoBatch, redoBatch }).map(show);
    expect(batched(true, false)).toEqual([
      'Ctrl+Z: undo (Alt to undo batch)',
      'Ctrl+Y or Ctrl+Shift+Z: redo',
    ]);
    expect(batched(false, true)).toEqual([
      'Ctrl+Z: undo',
      'Ctrl+Y or Ctrl+Shift+Z: redo (Alt to redo batch)',
    ]);
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
      expect(hintsFor(drawing, empty).map(show).slice(-1)).toEqual(PROJECT_ROWS);
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

  it('typing in the search field: Enter opens the first result (^745)', () => {
    expect(rows('list', 'typing')).toEqual(['Enter: open first result', 'Esc: close']);
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

describe('visited controls are hidden (^110)', () => {
  it('a control that was used has no hint, each on its own', () => {
    const all = rows(false, empty, 2);
    const some = hintsFor(false, empty, 2, { hidden: hiddenIds('pan', 'select-box') }).map(show);
    expect(all).toContain('RMB drag: pan');
    expect(some).not.toContain('RMB drag: pan');
    expect(some).not.toContain('LMB drag: select');
    expect(some).toContain('Wheel: zoom');
    expect(some).toContain('MMB drag: rotate');
  });

  it('with the camera and select controls visited, drawing is the only mouse hint on a blank map', () => {
    const visitedIds = hiddenIds('pan', 'zoom', 'rotate', 'select-box', 'view');
    expect(hintsFor(false, empty, 0, { hidden: visitedIds }).map(show)).toEqual([
      'LMB: draw mode',
      ...PROJECT_ROWS,
    ]);
  });

  it('draw mode and moving are not hidden, only the camera rows are (^389)', () => {
    const all = () => true;
    const rows = (h: ReturnType<typeof hintsFor>) =>
      h.map(show).filter((r) => !r.startsWith('Tab') && !CAMERA.includes(r));
    expect(rows(hintsFor(true, empty, 0, { hidden: all }))).toEqual(rows(hintsFor(true, empty, 0)));
    expect(hintsFor(false, node(false), 0, { hidden: all }).map(show)).toContain(
      'LMB drag: move node',
    );
  });
});

describe('Tab (^104)', () => {
  it('is visited like the others, in view mode too (^104)', () => {
    expect(hintsFor(false, empty).map(show)).toContain('Tab: view mode');
    expect(hintsFor(false, empty, 0, { hidden: hiddenIds('view') }).map(show)).not.toContain(
      'Tab: view mode',
    );
    // The way out of view mode is never hidden: it is the only one (^384).
    expect(viewHints(hiddenIds('view')).map(show)).toContain('Tab: select mode');
    expect(viewHints().map(show)).toEqual([
      'Tab: select mode',
      'RMB drag: pan',
      'Wheel: zoom',
      'MMB drag: rotate',
      'P: projects',
    ]);
  });

  it('undo and redo can be visited, too', () => {
    const rowsOf = (...ids: string[]) =>
      historyHints({ undo: true, redo: true, redoBatch: true }, hiddenIds(...ids)).map(show);
    expect(rowsOf()).toHaveLength(2);
    expect(rowsOf('undo')).toEqual(['Ctrl+Y or Ctrl+Shift+Z: redo (Alt to redo batch)']);
  });
});

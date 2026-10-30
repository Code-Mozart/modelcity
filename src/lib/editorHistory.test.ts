import { describe, expect, it } from 'vitest';
import { actionFor } from './keymap';
import { at, click, draw } from './testing/editorHelpers';

const undo = { ctrl: true, shift: false };
const redo = { ctrl: true, shift: true };

describe('undo and redo keys (^81)', () => {
  it('Ctrl+Z undoes, Ctrl+Y and Ctrl+Shift+Z redo, also with Cmd/caps', () => {
    expect(actionFor('z', undo)).toBe('undo');
    expect(actionFor('Z', redo)).toBe('redo');
    expect(actionFor('y', undo)).toBe('redo');
    expect(actionFor('q', undo)).toBeUndefined();
    expect(actionFor('Escape', { ctrl: false, shift: false })).toBe('finishRoad');
  });
});

describe('undo and redo in the editor (^81)', () => {
  it('each placed node is a step, in draw mode', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
      [40, 0],
    ]);
    expect(ed.canUndo).toBe(true);
    ed.key('z', undo);
    expect(ed.roads[0]!.nodes).toHaveLength(2);
    expect(ed.drawing).toBe(true);
    ed.key('z', undo);
    ed.key('z', undo);
    expect(ed.roads).toEqual([]);
    expect(ed.canUndo).toBe(false);
    ed.key('y', undo);
    ed.key('Z', redo);
    expect(ed.roads[0]!.nodes).toHaveLength(2);
    expect(ed.canRedo).toBe(true);
  });
});

describe('undo steps of dragging (^81)', () => {
  it('a drag is one step, a click without moving none; new work clears redo', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
    ]);
    ed.key('Escape');
    const steps = ed.history.past.length;
    click(ed, 20, -10);
    expect(ed.history.past).toHaveLength(steps);
    ed.pointerDown(at(20, -10));
    ed.pointerMove(at(30, -12));
    ed.pointerMove(at(35, -14));
    ed.pointerUp();
    expect(ed.history.past).toHaveLength(steps + 1);
    ed.key('z', undo);
    expect(ed.roads[0]!.nodes[1]).toMatchObject({ x: 20, y: -10 });
    expect(ed.canRedo).toBe(true);
    ed.pointerDown(at(20, -10));
    ed.pointerMove(at(25, -10));
    ed.pointerUp();
    expect(ed.canRedo).toBe(false);
  });
});

describe('undo of removing and cancelling (^81)', () => {
  it('removing nodes is a step, and undo brings them and their selection back', () => {
    const ed = draw([
      [0, 0],
      [20, -10],
      [40, 0],
    ]);
    ed.key('Escape');
    click(ed, 20, -10);
    ed.key('Delete');
    expect(ed.roads[0]!.nodes).toHaveLength(2);
    ed.key('z', undo);
    expect(ed.roads[0]!.nodes).toHaveLength(3);
    expect(ed.selection).toEqual([{ road: 0, node: 1 }]);
  });

  it('cancelling a lone node with Esc can be undone; undo is ignored while a button is down', () => {
    const ed = draw([[0, 0]]);
    ed.key('Escape');
    expect(ed.roads).toEqual([]);
    ed.key('z', undo);
    expect(ed.roads).toHaveLength(1);
    expect(ed.drawing).toBe(true);
    ed.pointerDown(at(30, 0));
    ed.key('z', undo);
    expect(ed.roads[0]!.nodes).toHaveLength(2);
  });
});

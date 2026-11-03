import { describe, expect, it } from 'vitest';
import { at, click, draw, lastBatchSize } from '../testing/editorHelpers';

const batchUndo = { ctrl: true, shift: false, alt: true };
const batchRedo = { ctrl: true, shift: true, alt: true };
const names = (ed: ReturnType<typeof draw>) => ed.timeline.history.past.map((s) => s.name);

const road = () => {
  const ed = draw([
    [0, 0],
    [40, -20],
    [80, 0],
  ]);
  ed.key('Escape');
  return ed;
};

describe('names of steps (^216)', () => {
  it('a drawn road: placed nodes and finishing, lower case', () => {
    expect(names(road())).toEqual(['place node', 'place node', 'place node', 'finish road']);
  });

  it('dragging a node, its heading, deleting', () => {
    const ed = road();
    ed.pointerDown(at(40, -20));
    ed.pointerMove(at(45, -25));
    ed.pointerUp();
    expect(names(ed).at(-1)).toBe('move node');
    ed.key('Delete');
    expect(names(ed).at(-1)).toBe('delete node');
  });

  it('selecting and deselecting say how many nodes', () => {
    const ed = road();
    click(ed, 0, 0);
    expect(names(ed).at(-1)).toBe('select node');
    click(ed, 500, 500);
    expect(names(ed).at(-1)).toBe('deselect all');
  });
});

describe('batches (^103, ^216)', () => {
  it('the steps of a drawing session are one batch, the next road another', () => {
    const ed = road();
    expect(lastBatchSize(ed.timeline.history.past)).toBe(4);
    click(ed, 500, 500);
    click(ed, 100, 100);
    click(ed, 130, 100);
    expect(lastBatchSize(ed.timeline.history.past)).toBe(2);
  });

  it('selection steps are a batch that ends with the first step of another kind', () => {
    const ed = road();
    click(ed, 0, 0);
    click(ed, 40, -20);
    click(ed, 80, 0);
    expect(lastBatchSize(ed.timeline.history.past)).toBe(3);
    ed.key('Delete');
    expect(lastBatchSize(ed.timeline.history.past)).toBe(1);
  });
});

describe('undoing batches (^103, ^216)', () => {
  it('Alt+Ctrl+Z undoes the whole batch, Alt+Ctrl+Shift+Z redoes it; Ctrl+Z only one step', () => {
    const ed = road();
    click(ed, 0, 0);
    click(ed, 40, -20);
    click(ed, 80, 0);
    ed.key('z', { ctrl: true, shift: false });
    expect(ed.selection).toHaveLength(1);
    ed.key('z', batchUndo);
    expect(ed.selection).toEqual([]);
    expect(lastBatchSize(ed.timeline.history.future)).toBe(3);
    ed.key('z', batchRedo);
    expect(ed.selection).toHaveLength(1);
    expect(ed.timeline.history.past.map((s) => s.name).slice(-3)).toEqual([
      'select node',
      'select node',
      'select node',
    ]);
  });

  it('every undo or redo announces itself, for the panel (^107)', () => {
    const ed = road();
    click(ed, 0, 0);
    expect(ed.timeline.event?.kind).toBe('step');
    ed.key('z', { ctrl: true, shift: false });
    expect(ed.timeline.event).toMatchObject({ kind: 'undo', steps: [{ name: 'select node' }] });
    ed.key('y', { ctrl: true, shift: false });
    expect(ed.timeline.event?.kind).toBe('redo');
  });
});

describe('a single step is a batch of one (^103)', () => {
  it('Alt+Ctrl+Z undoes it, Alt+Ctrl+Y redoes it', () => {
    const ed = road();
    click(ed, 0, 0);
    ed.key('Delete');
    expect(ed.chains).toHaveLength(1);
    ed.key('z', batchUndo);
    expect(ed.chains).toHaveLength(1);
    expect(ed.timeline.history.future).toHaveLength(1);
    ed.key('y', batchUndo);
    expect(ed.timeline.history.future).toHaveLength(0);
  });
});

describe('a change that changes nothing is no step (^227)', () => {
  it('entering draw mode and finishing with no node placed', () => {
    const ed = road();
    const steps = ed.timeline.history.past.length;
    click(ed, 500, 500);
    ed.key('Escape');
    expect(ed.timeline.history.past).toHaveLength(steps);
  });

  it('a drag that ends where it began is only a selection, and leaves the graph the object it was', () => {
    const ed = road();
    const graph = ed.graph;
    ed.pointerDown(at(40, -20));
    ed.pointerMove(at(48, -26));
    ed.pointerMove(at(40, -20));
    ed.pointerUp();
    expect(names(ed).at(-1)).toBe('select node');
    expect(ed.graph).toBe(graph);
  });
});

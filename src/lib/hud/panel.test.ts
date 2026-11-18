import { describe, expect, it } from 'vitest';
import {
  NO_HISTORY,
  record,
  redoStep,
  undoStep,
  type History,
  type StepKind,
} from '../editor/history';
import { deltaOf, selectionName, type Selection } from '../editor/selection';
import { panelHints, panelView, type PanelGroup } from './panel';

/** The nodes 1 to n are selected. */
const upTo = (n: number): Selection => new Set(Array.from({ length: n }, (_, i) => i + 1));

/** A step from the selection of n nodes to that of m nodes. */
const step = (name: string, kind: StepKind, n: number, m: number) => ({
  name,
  kind,
  continues: true,
  selection: deltaOf(upTo(n), upTo(m)),
  selectedAfter: m,
});

/** Take the steps `names` in order; each is a batch of its own unless it has the kind of the one before. */
const take = (names: string[], kind: StepKind = null): History =>
  names.reduce((h, name, i) => record(h, step(name, kind, i, i + 1)), NO_HISTORY);

const lines = (groups: PanelGroup[]) =>
  groups.flatMap((g) => g.rows.map((r) => (r.undone ? `(${r.name})` : r.name)));
const nine = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
const undo = (h: History, n: number): History =>
  Array.from({ length: n }).reduce<History>((acc) => undoStep(acc)!.history, h);

describe('the recent history panel window (^107)', () => {
  it('shows the last 7 steps with nothing undone', () => {
    expect(lines(panelView(take(nine)))).toEqual(['c', 'd', 'e', 'f', 'g', 'h', 'i']);
  });

  it('one undone step: 6 steps and that one; two: 5 and 2; three or more: 4 and 3, grayed', () => {
    expect(lines(panelView(undo(take(nine), 1)))).toEqual(['c', 'd', 'e', 'f', 'g', 'h', '(i)']);
    expect(lines(panelView(undo(take(nine), 2)))).toEqual(['c', 'd', 'e', 'f', 'g', '(h)', '(i)']);
    expect(lines(panelView(undo(take(nine), 5)))).toEqual([
      'a',
      'b',
      'c',
      'd',
      '(e)',
      '(f)',
      '(g)',
    ]);
  });

  it('redoing colors them back in, and fewer steps are fewer rows', () => {
    const h = undo(take(nine), 2);
    expect(lines(panelView(redoStep(h)!.history))).toEqual(['c', 'd', 'e', 'f', 'g', 'h', '(i)']);
    expect(lines(panelView(take(['a', 'b'])))).toEqual(['a', 'b']);
    expect(panelView(NO_HISTORY)).toEqual([]);
  });
});

describe('batches in the panel (^108)', () => {
  it('the rows of a batch are one group, other steps are groups of their own', () => {
    expect(panelView(take(['x', 'y', 'z'], 'draw'))).toHaveLength(1);
    expect(panelView(take(['x', 'y', 'z']))).toHaveLength(3);
  });

  it('a long batch shows its last 4 steps and how many it leaves out', () => {
    const groups = panelView(take(['a', 'b', 'c', 'd', 'e', 'f'], 'draw'));
    expect(groups[0]!.rows.map((r) => r.name)).toEqual(['c', 'd', 'e', 'f']);
    expect(groups[0]!.more).toBe(2);
  });
});

describe('selection steps are one row (^216)', () => {
  const selects = take(['a', 'b', 'c'], 'select');

  it('a run of selection steps is one row that says what it selected in the end', () => {
    expect(lines(panelView(selects))).toEqual(['select 3 nodes']);
  });

  it('a run that ends where it began changed nothing and has no row; the steps stay in the history', () => {
    const h = record(selects, step('deselect all', 'select', 3, 0));
    expect(panelView(h)).toEqual([]);
    expect(h.past).toHaveLength(4);
  });

  it('a run that ends with nothing selected, from a selection, says deselect all', () => {
    const h = record(NO_HISTORY, step('x', 'select', 2, 0));
    expect(lines(panelView(h))).toEqual(['deselect all']);
  });

  it('the name of a row is the name a single step would have', () => {
    const h = record(NO_HISTORY, step('x', 'select', 1, 4));
    expect(lines(panelView(h))).toEqual([selectionName(upTo(1), upTo(4))]);
  });
});

describe('selection rows and undo (^216)', () => {
  const selects = take(['a', 'b', 'c'], 'select');

  it('a partly undone run is a done row and a grayed row, side by side', () => {
    const h = undoStep(undoStep(selects)!.history)!.history;
    expect(lines(panelView(h))).toEqual(['select node', '(select 2 nodes)']);
    expect(panelView(h)).toHaveLength(1);
  });

  it('other steps between runs keep them apart', () => {
    const mixed = record(take(['a', 'b'], 'select'), step('move node', null, 2, 2));
    expect(lines(panelView(mixed))).toEqual(['select 2 nodes', 'move node']);
  });
});

describe('the hints at the bottom of the panel (^109, ^241)', () => {
  const none = () => false;

  it('are not shown while the panel has no row, though there is a step to undo', () => {
    const h = record(take(['a'], 'select'), step('deselect all', 'select', 1, 0));
    expect(h.past).toHaveLength(2);
    expect(panelView(h)).toEqual([]);
    expect(panelHints(h, none)).toEqual([]);
  });

  it('are there as soon as there is a row, with undo and redo as they are', () => {
    expect(panelHints(take(['a', 'b']), none)).toHaveLength(1);
    expect(panelHints(undoStep(take(['a', 'b']))!.history, none)).toHaveLength(2);
    expect(panelHints(NO_HISTORY, none)).toEqual([]);
  });
});

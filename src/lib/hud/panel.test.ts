import { describe, expect, it } from 'vitest';
import { emptyGraph } from '../model/graph';
import {
  NO_HISTORY,
  record,
  redoStep,
  undoStep,
  type History,
  type StepKind,
} from '../editor/history';
import { panelView, type PanelGroup } from './panel';

/** The state after `n` steps: the nodes 1 to n are selected (so every step selects one more). */
const snap = (n: number) => ({
  graph: emptyGraph(),
  active: null,
  end: 'end' as const,
  origin: null,
  selection: Array.from({ length: n }, (_, i) => i + 1),
});

/** Take the steps `names` in order; each is a batch of its own unless it has the kind of the one before. */
const take = (names: string[], kind: StepKind = null): History =>
  names.reduce(
    (h, name, i) =>
      record(h, { name, kind, before: snap(i), after: snap(i + 1), continues: true }).history,
    NO_HISTORY,
  );

const lines = (groups: PanelGroup[]) =>
  groups.flatMap((g) => g.rows.map((r) => (r.undone ? `(${r.name})` : r.name)));
const nine = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
const six = nine.slice(0, 6);
const undo = (h: History, n: number): History =>
  Array.from({ length: n }).reduce<History>((acc) => undoStep(acc)!.history, h);

describe('the recent history panel window (^107)', () => {
  it('shows the last 7 steps with nothing undone', () => {
    expect(lines(panelView(take(nine)))).toEqual(['c', 'd', 'e', 'f', 'g', 'h', 'i']);
  });

  it('one undone step: 6 steps and that one; two: 5 and 2; three or more: 4 and 3, grayed', () => {
    expect(lines(panelView(undo(take(nine), 1)))).toEqual(['c', 'd', 'e', 'f', 'g', 'h', '(i)']);
    expect(lines(panelView(undo(take(nine), 2)))).toEqual(['c', 'd', 'e', 'f', 'g', '(h)', '(i)']);
    expect(lines(panelView(undo(take(nine), 3)))).toEqual([
      'c',
      'd',
      'e',
      'f',
      '(g)',
      '(h)',
      '(i)',
    ]);
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

  it('redoing colors them back in', () => {
    const h = undo(take(nine), 2);
    expect(lines(panelView(redoStep(h)!.history))).toEqual(['c', 'd', 'e', 'f', 'g', 'h', '(i)']);
  });

  it('has fewer rows when there are fewer steps', () => {
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
    const groups = panelView(take(six, 'draw'));
    expect(groups[0]!.rows.map((r) => r.name)).toEqual(['c', 'd', 'e', 'f']);
    expect(groups[0]!.more).toBe(2);
  });
});

describe('selection steps are one row (^216)', () => {
  /** Selecting the nodes 1, 2, 3 one after another. */
  const selects = take(['a', 'b', 'c'], 'select');

  it('a run of selection steps is one row that says what it selected in the end', () => {
    expect(lines(panelView(selects))).toEqual(['select 3 nodes']);
  });

  it('a run that ends where it began changed nothing and has no row; the steps stay in the history', () => {
    const h = record(selects, {
      name: 'deselect all',
      kind: 'select',
      before: snap(3),
      after: snap(0),
      continues: true,
    }).history;
    expect(panelView(h)).toEqual([]);
    expect(h.past).toHaveLength(4);
  });

  it('a run that ends with nothing selected, from a selection, says deselect all', () => {
    const h = record(NO_HISTORY, {
      name: 'x',
      kind: 'select',
      before: snap(2),
      after: snap(0),
      continues: true,
    }).history;
    expect(lines(panelView(h))).toEqual(['deselect all']);
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
    const h = take(['a', 'b'], 'select');
    const mixed = record(h, {
      name: 'move node',
      kind: null,
      before: snap(2),
      after: snap(2),
      continues: true,
    }).history;
    expect(lines(panelView(mixed))).toEqual(['select 2 nodes', 'move node']);
  });
});

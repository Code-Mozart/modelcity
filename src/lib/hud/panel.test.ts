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

const snap = (n: number) => ({
  graph: emptyGraph(),
  active: null,
  end: 'end' as const,
  origin: null,
  selection: n ? [n] : [],
});

/** Take the steps `names` in order; each is a batch of its own unless it has the kind of the one before. */
const take = (names: string[], kind: StepKind = null): History =>
  names.reduce(
    (h, name, i) =>
      record(h, { name, kind, before: snap(i), after: snap(i + 1), continues: true }).history,
    NO_HISTORY,
  );

const lines = (groups: PanelGroup[]) =>
  groups.flatMap((g) => g.rows.map((r) => (r.undone ? `(${r.step.name})` : r.step.name)));
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
  it('the steps of a batch are one group, other steps are groups of their own', () => {
    expect(panelView(take(['x', 'y', 'z'], 'select'))).toHaveLength(1);
    expect(panelView(take(['x', 'y', 'z']))).toHaveLength(3);
  });

  it('a long batch shows its last 4 steps and how many it leaves out', () => {
    const groups = panelView(take(six, 'select'));
    expect(groups[0]!.rows.map((r) => r.step.name)).toEqual(['c', 'd', 'e', 'f']);
    expect(groups[0]!.more).toBe(2);
  });

  it('a batch can be partly undone: its steps keep their place, only the undone ones are marked', () => {
    const h = undoStep(undoStep(take(['x', 'y', 'z'], 'select'))!.history)!.history;
    expect(panelView(h)).toHaveLength(1);
    expect(lines(panelView(h))).toEqual(['x', '(y)', '(z)']);
  });
});

import type { History, Step } from '../editor/history';
import { historyHints, type Hidden, type Hint } from '../hints/hints';
import { sameSelection } from '../editor/selection';
import { selectionName } from '../editor/stepNames';

/** How many rows the recent history panel shows, and the most of them that are undone (^107, 7 and 3: the user's numbers). */
export const WINDOW = 7;
export const MAX_UNDONE = 3;
/** A batch with more steps than this shows only its last ones (^108). */
const MANY = 5;
const SHOWN = 4;

/** One row of the panel: a step, or a run of selection steps as one (^216). */
export interface PanelRow {
  /** The first step of the row, which identifies it. */
  step: Step;
  name: string;
  /** Undone: grayed out until it is redone. */
  undone: boolean;
}

/** Rows of one batch in the window (^108). */
export interface PanelGroup {
  /** How many steps of a long batch are not shown (`(N more steps)`). */
  more: number;
  rows: PanelRow[];
}

/**
 * The steps in the order they happened, as rows. A run of selection steps of one batch that are
 * all done (or all undone) is one row, `select 3 nodes`, named by what it changed in the end; a
 * run that ends where it began (select, then deselect all) changed nothing and has no row. The
 * steps are still in the history.
 */
function rowsOf(h: History): PanelRow[] {
  const steps = [
    ...h.past.map((step) => ({ step, undone: false })),
    ...[...h.future].reverse().map((step) => ({ step, undone: true })),
  ];
  const rows: PanelRow[] = [];
  let run: typeof steps = [];
  const flush = () => {
    if (run.length) rows.push(...collapse(run));
    run = [];
  };
  for (const item of steps) {
    const joins = item.step.kind === 'select' && run[0]?.step.batch === item.step.batch;
    if (!joins || run[0]!.undone !== item.undone) flush();
    if (item.step.kind === 'select') run.push(item);
    else rows.push({ step: item.step, name: item.step.name, undone: item.undone });
  }
  flush();
  return rows;
}

function collapse(run: { step: Step; undone: boolean }[]): PanelRow[] {
  const [first, last] = [run[0]!, run.at(-1)!];
  const [from, to] = [first.step.before.selection, last.step.after.selection];
  if (sameSelection(from, to)) return [];
  return [{ step: first.step, name: selectionName(from, to), undone: first.undone }];
}

/**
 * What the recent history panel shows (^107): a window of the last 7 rows. With nothing undone
 * all 7 are done; with 1 undone 6 and that one; with 2, 5 and 2; with 3 or more undone, 4 and
 * the next 3 to be redone, grayed out. Rows of one batch are grouped, with their lines joined.
 */
export function panelView(h: History): PanelGroup[] {
  const all = rowsOf(h);
  const undone = Math.min(all.filter((r) => r.undone).length, MAX_UNDONE);
  const done = all.filter((r) => !r.undone);
  const rows = [...done.slice(-(WINDOW - undone)), ...all.filter((r) => r.undone).slice(0, undone)];
  const groups: PanelRow[][] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && last[0]!.step.batch === row.step.batch) last.push(row);
    else groups.push([row]);
  }
  return groups.map((group) => describe(h, group));
}

function describe(h: History, group: PanelRow[]): PanelGroup {
  const batch = group[0]!.step.batch;
  const steps = [...h.past, ...h.future].filter((s) => s.batch === batch);
  const long = steps[0]!.kind !== 'select' && steps.length > MANY;
  const rows = long ? group.slice(-SHOWN) : group;
  return { more: long ? steps.length - rows.length : 0, rows };
}

/**
 * The undo and redo hints at the bottom of the panel (^109): only while the panel has something to
 * say. A select followed by a deselect changed nothing and has no row, though there is a step to
 * undo; hints with no step beside them would be lonely (^241).
 */
export function panelHints(h: History, hidden: Hidden): Hint[] {
  if (!panelView(h).length) return [];
  return historyHints({ undo: h.past.length > 0, redo: h.future.length > 0 }, hidden);
}

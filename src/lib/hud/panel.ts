import type { History, Step } from '../editor/history';

/** How many steps the recent history panel shows, and the most of them that are undone (^107, 7 and 3: the user's numbers). */
export const WINDOW = 7;
export const MAX_UNDONE = 3;
/** A batch with more steps than this shows only its last ones (^108). */
const MANY = 5;
const SHOWN = 4;

export interface PanelRow {
  step: Step;
  /** Undone: grayed out until it is redone. */
  undone: boolean;
}

/** Steps of one batch in the window (^108). */
export interface PanelGroup {
  /** How many steps of a long batch are not shown (`(N more steps)`). */
  more: number;
  rows: PanelRow[];
}

/**
 * What the recent history panel shows (^107): a window of the last 7 steps. With nothing undone
 * all 7 are done; with 1 step undone 6 and that one; with 2, 5 and 2; with 3 or more undone, 4 and
 * the next 3 to be redone, grayed out. Steps of one batch are grouped, with their lines joined.
 */
export function panelView(h: History): PanelGroup[] {
  const undone = Math.min(h.future.length, MAX_UNDONE);
  const rows: PanelRow[] = [
    ...h.past.slice(-(WINDOW - undone)).map((step) => ({ step, undone: false })),
    ...h.future
      .slice(h.future.length - undone)
      .reverse()
      .map((step) => ({ step, undone: true })),
  ];
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
  const total = [...h.past, ...h.future].filter((s) => s.batch === batch).length;
  const long = total > MANY;
  const rows = long ? group.slice(-SHOWN) : group;
  return { more: long ? total - rows.length : 0, rows };
}

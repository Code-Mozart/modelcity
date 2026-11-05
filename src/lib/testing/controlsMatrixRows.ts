import type { Action, Rec, Snap } from './controlsMatrix';

/** One row of the table: an input in a context and what it did, for every try that did the same. */
export interface Row {
  mode: string;
  unders: string[];
  action: Action;
  mods: string[];
  out: string;
  hint: string;
  hintId: string;
  worlds: string[];
  sels: string[];
  snaps: Snap[];
  /** The row holds for every world, selection or snap state that was tried for these unders. */
  all: { worlds: boolean; sels: boolean; snaps: boolean };
}

const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

function selectionChange(r: Rec): string {
  if (sameSet(r.selBefore, r.selAfter)) return '';
  if (r.selAfter.length === 0) return 'the selection is cleared';
  if (sameSet(r.selAfter, [r.hovered])) return 'the selection becomes the hovered node';
  if (r.selBefore.every((id) => r.selAfter.includes(id))) return 'nodes are added to the selection';
  if (r.selAfter.every((id) => r.selBefore.includes(id)))
    return 'nodes are removed from the selection';
  return 'the selection is replaced';
}

/** What an input did, in words: the history step, the mode, the selection, the counts. */
export function outcomeOf(r: Rec): string {
  const parts = [
    r.steps ? `step \`${r.steps.replace(/\d+/g, 'N')}\`` : '',
    r.phase === r.mode ? '' : `goes to ${r.phase} mode`,
    selectionChange(r),
    r.dN || r.dE ? `nodes ${signed(r.dN)}, segments ${signed(r.dE)}` : '',
  ];
  return parts.filter(Boolean).join('; ');
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const key = (r: Rec) => `${outcomeOf(r)}\u0000${r.hint}\u0000${r.hintId}`;
const cond = (r: Rec) => `${r.world}\u0000${r.sel}\u0000${r.snap}`;
const uniq = <T>(xs: T[]) => [...new Set(xs)];

/** The tries of one mode, thing under the pointer and input, as rows by modifier. */
function rowsOfGroup(recs: Rec[]): Row[] {
  const [first] = recs;
  const universe = {
    worlds: uniq(recs.map((r) => r.world)),
    sels: uniq(recs.map((r) => r.sel)),
    snaps: uniq(recs.map((r) => r.snap)),
  };
  const byMod = new Map<string, Map<string, Rec[]>>();
  for (const r of recs.filter((x) => outcomeOf(x) || x.hint)) {
    const outcomes = byMod.get(r.mod) ?? new Map<string, Rec[]>();
    outcomes.set(key(r), [...(outcomes.get(key(r)) ?? []), r]);
    byMod.set(r.mod, outcomes);
  }
  const merged = new Map<string, Row>();
  for (const [mod, outcomes] of byMod) {
    for (const rs of outcomes.values()) {
      const id = `${key(rs[0]!)}\u0001${uniq(rs.map(cond)).sort().join('\u0002')}`;
      const row = merged.get(id) ?? toRow(first!, rs, universe);
      if (!row.mods.includes(mod)) row.mods.push(mod);
      merged.set(id, row);
    }
  }
  return [...merged.values()];
}

function toRow(first: Rec, rs: Rec[], u: { worlds: string[]; sels: string[]; snaps: Snap[] }): Row {
  const [w, s, p] = [
    uniq(rs.map((r) => r.world)),
    uniq(rs.map((r) => r.sel)),
    uniq(rs.map((r) => r.snap)),
  ];
  return {
    mode: first.mode,
    unders: [first.under],
    action: first.action,
    mods: [],
    out: outcomeOf(rs[0]!),
    hint: rs[0]!.hint,
    hintId: rs[0]!.hintId,
    worlds: w,
    sels: s,
    snaps: p,
    all: {
      worlds: w.length === u.worlds.length,
      sels: s.length === u.sels.length,
      snaps: p.length === u.snaps.length,
    },
  };
}

/** The rows of all tries: modifiers merged where they did the same, then the things under the pointer. */
export function groupRows(recs: Rec[]): Row[] {
  const groups = new Map<string, Rec[]>();
  for (const r of recs) {
    const k = `${r.mode}|${r.under}|${r.action}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const merged = new Map<string, Row>();
  for (const rs of groups.values()) {
    for (const row of rowsOfGroup(rs)) {
      const id = JSON.stringify([
        row.mode,
        row.action,
        row.mods,
        row.out,
        row.hint,
        row.worlds,
        row.sels,
        row.snaps,
      ]);
      const twin = merged.get(id);
      if (twin) twin.unders.push(...row.unders);
      else merged.set(id, row);
    }
  }
  return [...merged.values()];
}

const UNDER: Record<string, string> = {
  void: 'over the void',
  node: 'over a node',
  head: 'over a heading control point',
  rad_end: 'over an end radius point',
  rad_mid: 'over the mid radius point',
  bend: 'over a bend point',
  segment: 'over a segment',
  'active node': 'over the node being drawn from',
};
const underText = (u: string) =>
  UNDER[u] ?? (u.startsWith('void,') ? `over the void (${u.slice(6)})` : u);

function inputText(action: Action, mods: string[]): string {
  const button = { click: 'LMB', drag: 'LMB drag', rmb: 'RMB', esc: 'Esc' }[action];
  if (action === 'esc') return 'Esc';
  return mods.map((m) => (m === 'none' ? button : `${m}+${button}`)).join(' or ');
}

function contextText(r: Row): string {
  const parts = [
    r.all.sels ? '' : `selection: ${r.sels.join('; ')}`,
    r.all.worlds ? '' : r.worlds.join('; '),
    r.all.snaps ? '' : `the pointer is ${r.snaps.join(' or ')}`,
  ];
  return parts.filter(Boolean).join('; ') || '-';
}

/** The table without hats (they are added by hand, ^392): one line per row. */
export function rowsToMarkdown(rows: Row[]): string {
  const head = [
    '| Mode | Under the pointer | Additional context | Input | What it says | What it does | Displayed where | Visitable |',
    '|------|-------------------|--------------------|-------|--------------|--------------|-----------------|-----------|',
  ];
  const line = (r: Row) =>
    [
      r.mode,
      r.unders.map(underText).join(', '),
      contextText(r),
      inputText(r.action, r.mods),
      r.hint ? r.hint.split(': ').slice(1).join(': ') : '-',
      r.out || '-',
      r.hint ? 'control hints panel' : 'nowhere',
      r.hint ? (r.hintId ? 'yes' : 'no') : '-',
    ]
      .map((c) => c.replace(/\|/g, '\\|'))
      .join(' | ');
  return [...head, ...rows.map((r) => `| ${line(r)} |`)].join('\n');
}

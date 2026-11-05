import type { Action, Rec } from './controlsMatrix';

/** The five things an input can depend on, besides the mode and the input itself. */
type Dim = 'under' | 'sel' | 'world' | 'snap' | 'mod';

/** A row of the table: an input in a context and what it did, for every try that did the same. */
export interface Row {
  mode: string;
  action: Action;
  out: string;
  hint: string;
  hintId: string;
  /** The values of each dimension the row holds for. */
  values: Record<Dim, string[]>;
  /** The dimensions the row does not depend on: it holds for every value there is with the others. */
  any: Record<Dim, boolean>;
}

const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && a.every((x) => b.includes(x));
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
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

const keyOf = (r: Rec) => `${outcomeOf(r)}|${r.hint}|${r.hintId}`;
const DIMS = ['sel', 'world', 'snap', 'mod'] as const;
type Part = (typeof DIMS)[number];
const uniq = <T>(xs: T[]) => [...new Set(xs)];
/** The selection as a try saw it: its class, or only whether anything was selected (when that is all that matters). */
const field = (r: Rec, d: Part, coarse = false): string =>
  d === 'sel' && coarse ? (r.selBefore.length ? 'something selected' : 'nothing selected') : r[d];

/** Whether the outcome of the tries (one place) is the same whatever value `d` has, the others being equal. */
function irrelevant(recs: Rec[], d: Part, coarse = false): boolean {
  const byOthers = new Map<string, Set<string>>();
  for (const r of recs) {
    const k = DIMS.filter((x) => x !== d)
      .map((x) => field(r, x, coarse))
      .join('\u0000');
    byOthers.set(k, (byOthers.get(k) ?? new Set()).add(keyOf(r)));
  }
  return [...byOthers.values()].every((outcomes) => outcomes.size === 1);
}

/** A set of tries that did the same, by the values of the dimensions that matter. */
type Cube = Record<Part, Set<string>>;
const same = <T>(a: Set<T>, b: Set<T>) => a.size === b.size && [...a].every((x) => b.has(x));

/** Two cubes that differ in one dimension only are one cube. */
function mergeable(a: Cube, b: Cube): Part | null {
  const diff = DIMS.filter((d) => !same(a[d], b[d]));
  return diff.length === 1 ? diff[0]! : null;
}

function findPair(list: Cube[]): [number, number, Part] | null {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const d = mergeable(list[i]!, list[j]!);
      if (d !== null) return [i, j, d];
    }
  }
  return null;
}

function reduce(cubes: Cube[]): Cube[] {
  let list = cubes;
  for (let pair = findPair(list); pair; pair = findPair(list)) {
    const [i, j, d] = pair;
    const merged = { ...list[i]!, [d]: new Set([...list[i]![d], ...list[j]![d]]) };
    list = [...list.filter((_, k) => k !== i && k !== j), merged];
  }
  return list;
}

const ALL = '\u0001any';
const cubeOf = (r: Rec, ignored: Part[], coarse: boolean): Cube =>
  Object.fromEntries(
    DIMS.map((d) => [d, new Set([ignored.includes(d) ? ALL : field(r, d, coarse)])]),
  ) as Cube;

/** The rows of one place (mode, input, thing under the pointer): dimensions that never matter are left out. */
/** Whether telling the selections of one kind apart (only the node, the node and others) never changes the outcome. */
function coarsenable(recs: Rec[]): boolean {
  const groups = new Map<string, Set<string>>();
  for (const r of recs) {
    const k = DIMS.map((d) => field(r, d, true)).join('\u0000');
    groups.set(k, (groups.get(k) ?? new Set()).add(keyOf(r)));
  }
  return [...groups.values()].every((o) => o.size === 1);
}

function rowsOfPlace(recs: Rec[]): Row[] {
  const coarse = coarsenable(recs);
  const ignored = DIMS.filter((d) => irrelevant(recs, d, coarse));
  const byOutcome = new Map<string, Rec[]>();
  for (const r of recs.filter((x) => outcomeOf(x) || x.hint)) {
    byOutcome.set(keyOf(r), [...(byOutcome.get(keyOf(r)) ?? []), r]);
  }
  return [...byOutcome.values()].flatMap((rs) =>
    reduce(rs.map((r) => cubeOf(r, ignored, coarse))).map((cube) => {
      const first = rs[0]!;
      const values = Object.fromEntries(DIMS.map((d) => [d, [...cube[d]]])) as Record<
        Part,
        string[]
      >;
      const covers = (d: Part) =>
        ignored.includes(d) ||
        recs.every((r) => !matches(r, cube, d, coarse) || cube[d].has(field(r, d, coarse)));
      return {
        mode: first.mode,
        action: first.action,
        out: outcomeOf(first),
        hint: first.hint,
        hintId: first.hintId,
        values: { under: [first.under], ...values },
        any: { under: false, ...Object.fromEntries(DIMS.map((d) => [d, covers(d)])) } as Row['any'],
      };
    }),
  );
}

/** Whether a try agrees with the cube on every dimension but `d`. */
const matches = (r: Rec, cube: Cube, d: Part, coarse: boolean) =>
  DIMS.filter((x) => x !== d).every((x) => cube[x].has(ALL) || cube[x].has(field(r, x, coarse)));

const signature = (r: Row) =>
  JSON.stringify([
    r.mode,
    r.action,
    r.out,
    r.hint,
    r.values.sel,
    r.values.world,
    r.values.snap,
    r.values.mod,
  ]);

/** The rows of all tries: by place, dimensions that never matter left out, equal rows of several places merged. */
export function groupRows(recs: Rec[]): Row[] {
  const places = new Map<string, Rec[]>();
  for (const r of recs) {
    const k = `${r.mode}|${r.action}|${r.under}`;
    places.set(k, [...(places.get(k) ?? []), r]);
  }
  const merged = new Map<string, Row>();
  for (const rs of places.values()) {
    for (const row of rowsOfPlace(rs)) {
      const twin = merged.get(signature(row));
      if (twin) twin.values.under.push(...row.values.under);
      else merged.set(signature(row), row);
    }
  }
  return [...merged.values()].map((row) => ({
    ...row,
    any: { ...row.any, under: uniq(row.values.under).length >= UNDER_ALL(recs, row) },
  }));
}

/** How many places there are for this mode and input. */
const UNDER_ALL = (recs: Rec[], row: Row) =>
  uniq(recs.filter((r) => r.mode === row.mode && r.action === row.action).map((r) => r.under))
    .length;

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

const BUTTON = { click: 'LMB', drag: 'LMB drag', rmb: 'RMB', esc: 'Esc' } as const;

const shown = (r: Row, d: Part) => !(r.any[d] || r.values[d].includes(ALL));

function inputText(r: Row): string {
  if (r.action === 'esc') return 'Esc';
  if (!shown(r, 'mod')) return `${BUTTON[r.action]} (with any modifier)`;
  return r.values.mod
    .map((m) => (m === 'none' ? BUTTON[r.action] : `${m}+${BUTTON[r.action]}`))
    .join(' or ');
}

function contextText(r: Row): string {
  const parts = [
    shown(r, 'sel') ? `selection: ${r.values.sel.join('; ')}` : '',
    shown(r, 'world') ? r.values.world.join('; ') : '',
    shown(r, 'snap') ? `the pointer is ${r.values.snap.join(' or ')}` : '',
  ];
  return parts.filter(Boolean).join('; ') || '-';
}

const describeUnder = (r: Row) =>
  r.any.under ? 'anywhere' : uniq(r.values.under).map(underText).join(', ');

/** The table without hats (they are added by hand, ^392): one line per row, in a stable order. */
export function rowsToMarkdown(rows: Row[]): string {
  const head = [
    '| Mode | Under the pointer | Additional context | Input | What it says | What it does | Displayed where | Visitable |',
    '|------|-------------------|--------------------|-------|--------------|--------------|-----------------|-----------|',
  ];
  const line = (r: Row) =>
    [
      r.mode,
      describeUnder(r),
      contextText(r),
      inputText(r),
      r.hint ? r.hint.split(': ').slice(1).join(': ') : '-',
      r.out || '-',
      r.hint ? 'control hints panel' : 'nowhere',
      r.hint ? (r.hintId ? 'yes' : 'no') : '-',
    ]
      .map((c) => c.replace(/\|/g, '\\|'))
      .join(' | ');
  const order = (r: Row) =>
    `${['select', 'draw', 'extend'].indexOf(r.mode)}|${r.values.under[0]}|${r.action}|${r.values.mod.join()}`;
  return [
    ...head,
    ...[...rows].sort((a, b) => order(a).localeCompare(order(b))).map((r) => `| ${line(r)} |`),
  ].join('\n');
}

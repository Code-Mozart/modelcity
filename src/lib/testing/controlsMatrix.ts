import { Editor } from '../editor/editor.svelte';
import { at } from './editorHelpers';
import { fromFile } from '../project/file';
import { parseProject } from '../project/migrate';
import { hintsFor, type Hint } from '../hints/hints';
import { show } from './hintHelpers';
import { headingFrom, placedHeading } from '../snap/heading';
import { curveOfEdge } from '../editor/chains';
import { curveAt, handleAt } from '../editor/hits';
import { pointOn } from '../curves/piece';
import { branchOfEdge } from '../model/junction';

/**
 * The controls matrix (^371): the editor engine driven over the combinations of mode, what is under
 * the pointer, button and manner, modifiers, selection, parallel segments and snapping, on a
 * project (`src/lib/testing/fixtures/combinations.json`). It records what each input did; no browser, no screen.
 */
export type Mode = 'select' | 'draw' | 'extend';
export type Action = 'click' | 'drag' | 'rmb' | 'esc';
export const MODS = ['none', 'Alt', 'Shift', 'Ctrl', 'Alt+Shift'] as const;
export const ACTIONS: Action[] = ['click', 'drag', 'rmb', 'esc'];
export type Snap = 'not snapped' | 'position only' | 'position and heading' | 'heading only';

export interface Spot {
  x: number;
  y: number;
}
/** A place to point at: what is under the pointer there, and the node and segment it belongs to. */
export interface Target {
  under: string;
  at: Spot;
  world: string;
  node: number;
  edge: number;
  /** Where a drag ends, if it is to end at a place that snaps. */
  dragTo?: Spot;
}
export interface Rec {
  mode: Mode;
  world: string;
  under: string;
  sel: string;
  action: Action;
  mod: string;
  snap: Snap;
  hint: string;
  hintId: string;
  steps: string;
  phase: string;
  selBefore: number[];
  selAfter: number[];
  hovered: number;
  dN: number;
  dE: number;
  /** Where the pointer was put, where a drag ended (if it was told to), the pinned nodes: enough to do the try again. */
  at: Spot;
  dragTo?: Spot;
  pinned: number[];
}

const modInfo = (mod: string) => ({
  alt: mod.includes('Alt'),
  shift: mod.includes('Shift'),
  ctrl: mod === 'Ctrl',
});

const graphOf = (text: string) => fromFile(parseProject(text)).graph;

/** An editor on the project, in the mode, with some nodes pinned; extend mode extends from node 1. */
export function freshEditor(text: string, mode: Mode, pinned: number[] = []): Editor {
  const ed = new Editor();
  ed.load(graphOf(text));
  ed.pins.set(pinned);
  if (mode === 'select') return ed;
  ed.enterDrawMode();
  if (mode === 'draw') return ed;
  const n = ed.graph.nodes.find((x) => x.id === 1)!;
  ed.pointerMove(at(n.x, n.y, { ctrl: true }));
  ed.pointerDown(at(n.x, n.y, { ctrl: true }));
  ed.pointerUp();
  return ed;
}

function hintsNow(ed: Editor): Hint[] {
  const heading =
    placedHeading(ed.snapped, false) !== null ||
    (ed.press !== null && headingFrom(ed.snapped, false) !== null);
  return hintsFor(ed.drawing, ed.hintTarget, ed.selection.length, {
    pinned: ed.pins.list.length,
    snapping: ed.snapped !== null,
    touching: heading,
    placing: ed.drawing,
  });
}

/** The hint row for an input: the button, the manner and the modifiers, or `Esc`. */
function rowFor(rows: Hint[], action: Action, mod: string): Hint | undefined {
  const m = modInfo(mod);
  const button = action === 'rmb' ? 'rmb' : 'lmb';
  return rows.find((h) =>
    h.inputs.some((i) =>
      action === 'esc'
        ? i.kind === 'key' && i.label === 'Esc'
        : i.kind === 'mouse' &&
          i.button === button &&
          !!i.drag === (action === 'drag') &&
          !!i.shift === m.shift &&
          !!i.alt === m.alt,
    ),
  );
}

/**
 * Whether the pointer is pulled to a snap suggestion, and whether that gives a heading: for a node
 * the one of its lane or normal, for a heading control point the one it copies (^313).
 */
export function snapOf(ed: Editor, turning = false): Snap {
  if (!ed.snapped) return 'not snapped';
  const heading = turning
    ? headingFrom(ed.snapped, false) !== null
    : placedHeading(ed.snapped, false) !== null;
  if (turning) return heading ? 'heading only' : 'not snapped';
  return heading ? 'position and heading' : 'position only';
}

function snapSelections(mode: Mode, t: Target, others: number[]): Record<string, number[]> {
  if (mode !== 'select') return { nothing: [] };
  const rest = { 'something else selected': others.slice(0, 2) };
  if (t.under === 'node') {
    return {
      nothing: [],
      'only the hovered node': [t.node],
      'the hovered node and others': [t.node, ...others.slice(0, 2)],
      'only one other node': others.slice(0, 1),
      'other nodes, not the hovered one': others.slice(0, 2),
    };
  }
  return { nothing: [], ...rest };
}

/** The selections to try for a target: for a segment its nodes, part of it, and its whole branch. */
export function selectionsOf(ed: Editor, mode: Mode, t: Target): Record<string, number[]> {
  const e = ed.graph.edges.find((x) => x.id === t.edge)!;
  const branch = branchOfEdge(ed.graph, t.edge);
  const others = ed.graph.nodes
    .map((n) => n.id)
    .filter((id) => ![e.start, e.end, ...branch, 1].includes(id));
  if (mode === 'select' && t.under === 'segment') {
    return {
      nothing: [],
      'both nodes of the hovered segment': [e.start, e.end],
      'part of the hovered segment (one node)': [e.start],
      'all of the hovered branch': branch,
      'other nodes': others.slice(0, 1),
    };
  }
  return snapSelections(mode, t, others);
}

function pointAway(ed: Editor, edge: number): Spot | null {
  for (const piece of curveOfEdge(ed.graph, edge)!.pieces) {
    for (let t = 0.15; t <= 0.85; t += 0.1) {
      const p = pointOn(piece, t);
      const info = at(p.x, p.y, { ctrl: true });
      if (!handleAt(ed.handles(4), info) && curveAt(ed.chains, info)) return { x: p.x, y: p.y };
    }
  }
  return null;
}

const handleSpot = (ed: Editor, type: string, edge: number, t?: number): Spot | null => {
  const found = ed
    .handles(4)
    .find(
      (h) =>
        h.type === type &&
        h.id === edge &&
        (t === undefined || h.t === t || (t === 0 && h.t === 1)),
    );
  return found ? { x: found.x, y: found.y } : null;
};

/** The places of one segment to point at: its node, heading point, bend, radius points and curve. */
export function targetsOf(ed: Editor, world: string, node: number, edge: number): Target[] {
  const n = ed.graph.nodes.find((x) => x.id === node)!;
  const head = ed.handles(4).find((h) => h.type === 'head' && h.id === node);
  const spots: [string, Spot | null][] = [
    ['void', { x: -60, y: 45 }],
    ['node', { x: n.x, y: n.y }],
    ['head', head ? { x: head.x, y: head.y } : null],
    ['rad_end', handleSpot(ed, 'rad', edge, 0)],
    ['rad_mid', handleSpot(ed, 'rad', edge, 0.5)],
    ['bend', handleSpot(ed, 'ctrl', edge)],
    ['segment', pointAway(ed, edge)],
  ];
  return spots.flatMap(([under, spot]) => (spot ? [{ under, at: spot, world, node, edge }] : []));
}

/** Places around the straight segment 9 (nodes 13 and 14, heading east) where its pinned suggestions snap. */
export function snapTargets(ed: Editor): Target[] {
  const base = targetsOf(ed, 'straight segment', 14, 9).filter((t) => t.under !== 'void');
  const void_ = (under: string, x: number, y: number): Target => ({
    under: `void, ${under}`,
    at: { x, y },
    world: 'straight segment',
    node: 14,
    edge: 9,
  });
  const withDrag = (t: Target): Target =>
    t.under === 'head' ? { ...t, dragTo: { x: 22.951, y: -80 } } : t;
  return [
    void_('not snapped', 40, -80),
    void_('on a snap line without a heading', 40, -61.097),
    void_('on a snap line with a heading', 22.951, -80),
    ...base.map(withDrag),
  ];
}

/** The input; for a drag the snap at the end of the drag is returned. */
function perform(ed: Editor, t: Target, action: Action, where: Where): Snap | undefined {
  if (action === 'drag') {
    ed.pointerDown(where(0, 0));
    ed.pointerMove(where(7, 5));
    const end = t.dragTo ? at(t.dragTo.x, t.dragTo.y, { ctrl: false }) : where(12, 9);
    ed.pointerMove(end);
    const snap = snapOf(ed, t.under === 'head');
    ed.pointerUp();
    return snap;
  }
  if (action === 'click') {
    ed.pointerDown(where(0, 0));
    ed.pointerUp();
  } else if (action === 'rmb') ed.rightClick(where(0, 0));
  else ed.key('Escape', { ctrl: false, shift: false });
  return undefined;
}

type Where = (dx: number, dy: number) => ReturnType<typeof at>;

interface Try {
  mode: Mode;
  t: Target;
  sel: [string, number[]];
  mod: string;
  action: Action;
  pinned: number[];
}

/** What is counted before an input, to say afterwards what it changed. */
const countsOf = (ed: Editor) => ({
  steps: ed.timeline.history.past.length,
  nodes: ed.graph.nodes.length,
  edges: ed.graph.edges.length,
  selection: [...ed.selection],
});

/** One try: set the state, point, do the input, write down what happened. */
export function runOne(text: string, s: Try): Rec {
  const ed = freshEditor(text, s.mode, s.pinned);
  ed.selection = [...s.sel[1]];
  const mi = modInfo(s.mod);
  const where = (dx: number, dy: number) => at(s.t.at.x + dx, s.t.at.y + dy, { ...mi });
  ed.pointerMove(where(0, 0));
  const [row, before] = [rowFor(hintsNow(ed), s.action, s.mod), countsOf(ed)];
  const hover = snapOf(ed);
  const snap = perform(ed, s.t, s.action, where) ?? hover;
  return {
    ...{ mode: s.mode, world: s.t.world, under: s.t.under, sel: s.sel[0], action: s.action },
    ...{ mod: s.mod, snap, hint: row ? show(row) : '', hintId: row?.id ?? '' },
    steps: ed.timeline.history.past
      .slice(before.steps)
      .map((x) => x.name)
      .join(' + '),
    phase: ed.phase,
    selBefore: before.selection,
    selAfter: [...ed.selection],
    hovered: s.t.node,
    dN: ed.graph.nodes.length - before.nodes,
    dE: ed.graph.edges.length - before.edges,
    at: s.t.at,
    dragTo: s.t.dragTo,
    pinned: s.pinned,
  };
}

const MODES: Mode[] = ['select', 'draw', 'extend'];

/** All tries of one target in one mode: its selections, modifiers and inputs. */
function triesOf(probe: Editor, mode: Mode, t: Target, pinned: number[]): Try[] {
  return Object.entries(selectionsOf(probe, mode, t)).flatMap((sel) =>
    MODS.flatMap((mod) => ACTIONS.map((action) => ({ mode, t, sel, mod, action, pinned }))),
  );
}

/** Every combination of one world (a node and a segment) with the pins used there. */
function runWorld(text: string, world: [string, number, number], pinned: number[]): Rec[] {
  const [name, node, edge] = world;
  return MODES.flatMap((mode) => {
    const probe = freshEditor(text, mode, pinned);
    const targets =
      name === 'straight segment' ? snapTargets(probe) : targetsOf(probe, name, node, edge);
    return targets.flatMap((t) => triesOf(probe, mode, t, pinned).map((x) => runOne(text, x)));
  });
}

/** Everything: segments without and with parallel ones, and the straight segment with its pins. */
export function runMatrix(text: string): Rec[] {
  return [
    ...runWorld(text, ['no parallel segments', 0, 0], []),
    ...runWorld(text, ['parallel segments', 8, 6], []),
    ...runWorld(text, ['straight segment', 14, 9], [13, 14]),
  ];
}

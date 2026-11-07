import { Editor } from '../editor/editor.svelte';
import { hintStateOf } from '../editor/hintState';
import { AREA_CONTROLS } from '../hints/areaControls';
import type { Control } from '../hints/controls';
import type { Facts } from '../hints/facts';
import { at } from './editorHelpers';
import { mapOf } from './snapHelpers';

/**
 * The pointer controls of select mode and of draw and extend mode, checked against the editor
 * (^783): in every state below the test does the input of every control that exists there and
 * compares whether the editor did anything with what the table says (`listens`).
 */
type C = Control<Facts>;
interface Spot {
  x: number;
  y: number;
}
export interface Scenario {
  name: string;
  /** Where the pointer is; a handle is found in the editor. */
  at: Spot | ((ed: Editor) => Spot);
  /** The nodes selected, one state each (select mode). */
  selections: number[][];
  /** Draw mode or extend mode, and from which node (a road is being drawn). */
  draw?: { from?: number; place?: Spot };
  /** Where a drag on the void or on a curve ends: the box it spans holds other nodes. */
  box?: Spot;
}

const NONE: number[][] = [[]];
const SELECTIONS = [[], [1], [1, 2], [0, 2], [0, 1, 2]];
const KEYS = { ctrl: false, shift: false };
/** Roads: A B C and D E, along the x axis; node ids 0 to 4. */
const MAP = () => {
  const g = mapOf([
    [
      [0, 0],
      [30, 0],
      [60, 0],
    ],
    [
      [0, 60],
      [30, 60],
    ],
    [
      [100, -60],
      [160, -20],
    ],
    // Two roads beside each other: the second one touches the first, so a derived node is on the first, at (230, -120).
    [
      [200, -120],
      [260, -120],
    ],
    [
      [230, -117],
      [250, -117],
    ],
  ]);
  // The last road turns: a bend with a bend point and radius points (the nodes 5 and 6, the segment 3).
  return { ...g, nodes: g.nodes.map((n) => (n.id === 6 ? { ...n, th: Math.PI / 2 } : n)) };
};

/** The place of a control point of the editor. */
const handleAt =
  (type: string, id: number, t?: number) =>
  (ed: Editor): Spot => {
    const h = ed
      .handles(4)
      .find((x) => x.type === type && x.id === id && (t === undefined || x.t === t));
    if (!h) throw new Error(`no ${type} handle ${id}`);
    return { x: h.x, y: h.y };
  };

export const SCENARIOS: Scenario[] = [
  { name: 'select: node B', at: { x: 30, y: 0 }, selections: SELECTIONS },
  {
    name: 'select: curve B C',
    at: { x: 45, y: 0 },
    selections: [[], [1, 2], [1], [0, 1, 2], [3]],
    box: { x: -5, y: 65 },
  },
  {
    name: 'select: the void',
    at: { x: -20, y: -20 },
    selections: [[], [0], [0, 1, 2]],
    box: { x: 35, y: 70 },
  },
  { name: 'select: a derived node', at: { x: 230, y: -120 }, selections: [[], [1]] },
  { name: 'draw: the void', at: { x: 100, y: 100 }, selections: NONE, draw: {} },
  { name: 'draw: curve B C', at: { x: 45, y: 0 }, selections: NONE, draw: {} },
  { name: 'draw: the end node C', at: { x: 60, y: 0 }, selections: NONE, draw: {} },
  { name: 'draw: node B', at: { x: 30, y: 0 }, selections: NONE, draw: {} },
  { name: 'select: the heading point of B', at: handleAt('head', 1), selections: [[], [1]] },
  { name: 'select: the bend point', at: handleAt('ctrl', 3), selections: [[], [5, 6]] },
  { name: 'select: a radius point', at: handleAt('rad', 3, 0.5), selections: [[], [5, 6]] },
  { name: 'draw: the heading point of B', at: handleAt('head', 1), selections: NONE, draw: {} },
  { name: 'draw: the bend point', at: handleAt('ctrl', 3), selections: NONE, draw: {} },
  { name: 'draw: a radius point', at: handleAt('rad', 3, 0.5), selections: NONE, draw: {} },
  {
    name: 'draw: the first node of a road, cancel it',
    at: { x: 150, y: 150 },
    selections: NONE,
    draw: { place: { x: 150, y: 150 } },
  },
  { name: 'extend from C: the void', at: { x: 100, y: 100 }, selections: NONE, draw: { from: 2 } },
  { name: 'extend from C: curve A B', at: { x: 15, y: 0 }, selections: NONE, draw: { from: 2 } },
  {
    name: 'extend from C: node C itself',
    at: { x: 60, y: 0 },
    selections: NONE,
    draw: { from: 2 },
  },
  {
    name: 'extend from C: the start of the road, A',
    at: { x: 0, y: 0 },
    selections: NONE,
    draw: { from: 2 },
  },
  {
    name: 'extend from C: the end of another road, E',
    at: { x: 30, y: 60 },
    selections: NONE,
    draw: { from: 2 },
  },
];

const where = (s: Scenario, ed: Editor): Spot => (typeof s.at === 'function' ? s.at(ed) : s.at);

export function ready(s: Scenario, selection: number[]): Editor {
  const ed = new Editor();
  ed.load(MAP());
  if (s.draw) {
    ed.enterDrawMode();
    const from =
      s.draw.from !== undefined ? ed.graph.nodes.find((x) => x.id === s.draw!.from) : s.draw.place;
    if (from) {
      ed.pointerDown(at(from.x, from.y));
      ed.pointerUp();
    }
  }
  ed.selection = selection;
  const to = where(s, ed);
  ed.pointerMove(at(to.x, to.y));
  return ed;
}

export const factsOf = (ed: Editor): Facts => ({
  viewing: ed.viewing,
  drawing: ed.drawing,
  target: ed.hintTarget,
  selected: ed.selection.length,
  state: { ...hintStateOf(ed), pinned: ed.pins.list.length },
});

/** Do the input of a control with the pointer where the scenario has it. */
function press(ed: Editor, c: C, s: Scenario) {
  const input = Array.isArray(c.input) ? c.input[0]! : c.input;
  if (input.kind === 'key') return ed.key(input.label === 'Esc' ? 'Escape' : 'Delete', KEYS);
  if (input.kind !== 'mouse') throw new Error('a key or the mouse');
  const mods = { shift: !!input.shift, alt: !!input.alt };
  const from = where(s, ed);
  const pointer = (x: number, y: number) => at(x, y, mods);
  if (input.button === 'rmb') return ed.rightClick(pointer(from.x, from.y));
  ed.pointerDown(pointer(from.x, from.y));
  if (input.drag) {
    ed.pointerMove(pointer(from.x + 5, from.y + 4));
    // On the void or a curve a drag spans a box that holds other nodes; on a handle it moves it.
    const box = ed.press?.kind === 'empty';
    ed.pointerMove(box && s.box ? pointer(s.box.x, s.box.y) : pointer(from.x + 12, from.y + 9));
  }
  ed.pointerUp();
}

/** Whether an input changed anything: the map, the selection, the history, the mode or the road drawn. */
export function effect(ed: Editor, c: C, s: Scenario): boolean {
  const was = {
    graph: ed.graph,
    selection: [...ed.selection].sort().join(),
    steps: ed.timeline.history.past.length,
    phase: ed.phase,
    active: ed.active,
  };
  press(ed, c, s);
  const now = [...ed.selection].sort().join();
  return (
    ed.graph !== was.graph ||
    now !== was.selection ||
    ed.timeline.history.past.length !== was.steps ||
    ed.phase !== was.phase ||
    ed.active !== was.active
  );
}

/** The controls that are on in a scenario and a selection. */
export const present = (s: Scenario, selection: number[]) => {
  const f = factsOf(ready(s, selection));
  return AREA_CONTROLS.filter((c) => c.on(f));
};

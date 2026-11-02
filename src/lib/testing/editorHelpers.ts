import { Editor, type PointerInfo } from '../editor/editor.svelte';
import { pointOn } from '../curves/piece';
import { positionOf } from '../editor/chains';

/** Helpers for tests of the editor: pointer positions, clicks, roads drawn by clicking. */
export const at = (x: number, y: number, extra: Partial<PointerInfo> = {}): PointerInfo => ({
  pt: { x, y },
  screen: { x: x * 4, y: y * 4 },
  project: (p) => ({ x: p.x * 4, y: p.y * 4 }),
  scale: 4,
  touch: false,
  shift: false,
  alt: false,
  // Snapping off, so that tests of other things place nodes exactly where they say (^101); tests of snapping pass `ctrl: false`.
  ctrl: true,
  ...extra,
});

/** A plain click: press and release without moving. */
export const click = (ed: Editor, x: number, y: number) => {
  ed.pointerDown(at(x, y));
  ed.pointerUp();
};

/** An editor in draw mode: one click on empty canvas in select mode enters it (^54). */
export const drawMode = () => {
  const ed = new Editor();
  click(ed, 500, 500);
  return ed;
};

/** A road drawn by clicking, left unfinished (the editor is in draw mode). */
export const draw = (points: [number, number][]) => {
  const ed = drawMode();
  for (const [x, y] of points) click(ed, x, y);
  return ed;
};

/** A finished road, then draw mode again: the start of most tests of splitting, merging and extending. */
export const roadThenDrawMode = (
  points: [number, number][] = [
    [0, 0],
    [40, -20],
    [80, 0],
  ],
) => {
  const ed = draw(points);
  ed.key('Escape');
  click(ed, 500, 500);
  return ed;
};

/** How many steps the batch at the end of a list of steps has (a batch is a run of steps with one number, ^103). */
export const lastBatchSize = (steps: { batch: number }[]) =>
  steps.filter((s) => s.batch === steps.at(-1)?.batch).length;

/** The last node of chain `road` (a chain is a run of edges, ^106). */
export const last = (ed: Editor, road = 0) => ed.chains[road]!.path.nodes.at(-1)!;

/**
 * A point on a curve that is not close to any handle (so pressing there inserts, not edits); on
 * edge number `edge` of all (in the order of the chains), else on any.
 */
export const bareCurvePoint = (ed: Editor, edge?: number) => {
  const handles = ed.handles(4);
  const all = ed.edges.flat();
  const samples = (edge === undefined ? all : [all[edge]!]).flatMap(({ E }) =>
    E.pieces.flatMap((piece) => Array.from({ length: 19 }, (_, i) => pointOn(piece, (i + 1) / 20))),
  );
  const bare = samples.find((p) => handles.every((h) => Math.hypot(h.x - p.x, h.y - p.y) > 4));
  if (!bare) throw new Error('no bare point on the curves');
  return bare;
};

/** The index of the chain the node being drawn from is on, null when nothing is drawn (the old "road being drawn"). */
export const roadDrawn = (ed: Editor): number | null => {
  const i = ed.chains.findIndex((c) => ed.active !== null && c.nodeIds.includes(ed.active));
  return ed.active === null || i < 0 ? null : i;
};

/** Where the selected node (last of the selection) is: chain and index. */
export const selAt = (ed: Editor) => positionOf(ed.chains, ed.sel!)!;

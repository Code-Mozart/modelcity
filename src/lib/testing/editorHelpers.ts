import { Editor, type PointerInfo } from '../editor.svelte';
import { pointOn } from '../curves/piece';

/** Helpers for tests of the editor: pointer positions, clicks, roads drawn by clicking. */
export const at = (x: number, y: number, extra: Partial<PointerInfo> = {}): PointerInfo => ({
  pt: { x, y },
  scale: 4,
  touch: false,
  shift: false,
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

export const last = (ed: Editor, road = 0) => ed.roads[road]!.nodes.at(-1)!;

/** A point on a curve that is not close to any handle (so pressing there inserts, not edits). */
export const bareCurvePoint = (ed: Editor) => {
  const handles = ed.handles(4);
  const samples = ed.edges
    .flat()
    .flatMap(({ E }) =>
      E.pieces.flatMap((piece) =>
        Array.from({ length: 19 }, (_, i) => pointOn(piece, (i + 1) / 20)),
      ),
    );
  const bare = samples.find((p) => handles.every((h) => Math.hypot(h.x - p.x, h.y - p.y) > 4));
  if (!bare) throw new Error('no bare point on the curves');
  return bare;
};

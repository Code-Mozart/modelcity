import type { Vec } from '../curves/vec';
import { edgeHandles } from '../editor/handles';
import { gripOf } from '../editor/movePress';
import type { NodeRow } from '../project/storage';
import { at, editing } from './editHarness';
import { edge, node } from './loadedMap';

/** C at (-100, 0), A at (0, 0) heading east, B at (100, 100) heading south: segment 11 is straight (C to A), segment 10 a bend (A to B) with its bend point at (100, 0). */
export const B: NodeRow = [2, 100_000, 100_000, Math.PI / 2];

/** The map of the move scenarios, in select mode or in draw mode, with a drag that holds what is under a world point. */
export async function moving(mode: 'select' | 'draw' = 'select') {
  const e = await editing([node(1, 0, 0), B, node(3, -100, 0)], [edge(10, 1, 2), edge(11, 3, 1)]);
  if (mode === 'draw') e.editor.enterDraw();
  /** A drag from one world point to another: false if nothing could be held there. */
  const drag = async (from: Vec, to: Vec, ctrl = false) => {
    const grip = gripOf(e.press.pickAt(at(from.x, from.y)));
    if (!grip) return false;
    e.move.grab(grip, at(from.x, from.y), false);
    e.move.move(at(to.x, to.y), ctrl);
    e.move.up();
    for (let i = 0; i < 20 && (e.editor.busy || i < 3); i++) await e.settle();
    return true;
  };
  const row = async (id: number) => (await e.rows()).nodes.find((n) => n[0] === id);
  const edgeRow = async (id: number) => (await e.rows()).edges.find((x) => x[0] === id);
  /** The control points of segment 10 (the bend) at the scale of the tests. */
  const bend = () => edgeHandles(edge(10, 1, 2), node(1, 0, 0), B, 1);
  return { ...e, drag, row, edgeRow, bend };
}

/** Each move control done in the editor (^488, ^697, ^695, ^696): what its hint says it does. */
export const moveScenarios = (mode: 'select' | 'draw'): Record<number, () => Promise<boolean>> => ({
  488: async () => {
    const m = await moving(mode);
    const ok = await m.drag({ x: -100, y: 0 }, { x: -100, y: -50 });
    const name = m.editor.history.past.at(-1)?.name;
    return ok && (await m.row(3))?.[2] === -50_000 && name === 'move node';
  },
  697: async () => {
    const m = await moving(mode);
    const ok = await m.drag({ x: -60, y: 0 }, { x: -60, y: 40 }, true);
    return ok && Math.abs((await m.row(3))![3] - Math.PI / 4) < 1e-9;
  },
  695: async () => {
    const m = await moving(mode);
    const ctrl = m.bend().find((h) => h.type === 'ctrl')!;
    const ok = await m.drag(ctrl, { x: 120, y: 0 });
    return (
      ok && (await m.row(2))![3] !== B[3] && m.editor.history.past.at(-1)?.name === 'bend curve'
    );
  },
  696: async () => {
    const m = await moving(mode);
    const rad = m.bend().find((h) => h.type === 'rad' && h.t === 0.5)!;
    // Towards the bend point: a smaller radius than the largest that fits (automatic).
    const ok = await m.drag(rad, { x: rad.x + 10, y: rad.y - 10 });
    return ok && (await m.edgeRow(10))![3] !== null;
  },
});

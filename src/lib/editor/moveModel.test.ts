import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { Vec } from '../curves/vec';
import { interactable } from '../map/hit';
import { IndexedDbStorage } from '../project/indexedDb';
import { MemoryStorage, type ProjectStorage } from '../project/storage';
import { at, editing, size, view } from '../testing/editHarness';
import { screenToWorld } from '../camera/view';
import { checkAgainst, dice, type Dice, randomMap } from '../testing/editModel';
import { rowsOf, whole } from '../testing/drawModel';
import type { Rows } from '../testing/mainRemoval';
import type { NextIds } from '../edit/graphPiece';
import { dropOf, gripOf } from './movePress';
import { dragged, droppedNode, type Grip } from './moving';
import { reachOf } from './pick';
import { DRAG_PX } from './selectPress';

globalThis.IDBKeyRange = IDBKeyRange;

type Harness = Awaited<ReturnType<typeof editing>>;
type Op = 'node' | 'group' | 'handle' | 'undo' | 'redo';
const OPS: Op[] = ['node', 'node', 'group', 'handle', 'handle', 'undo', 'redo'];

interface Model {
  rows: Rows;
  next: NextIds;
}

const idle = async (e: Harness) => {
  for (let i = 0; i < 200 && (e.editor.busy || i < 3); i++)
    await new Promise((r) => setTimeout(r, 0));
};

const world = (n: [number, number, number, ...unknown[]]): Vec => ({
  x: n[1] / 1000,
  y: n[2] / 1000,
});

/** Where a drag starts: on a node, or a little off it (often on its heading point, 40 m east of it at this scale, or a curve). */
function startOf(op: Op, m: Model, rand: Dice): Vec {
  const n = m.rows.nodes[rand(m.rows.nodes.length)]!;
  const p = world(n);
  if (op !== 'handle') return p;
  return { x: p.x + Math.cos(n[3]) * 40 + rand(3) - 1, y: p.y + Math.sin(n[3]) * 40 + rand(3) - 1 };
}

/** What the model expects of a drag of `grip` to `to`: the whole map dragged, and merged where it is let go (the same rules, on all of it). */
function expected(e: Harness, m: Model, drag: { grip: Grip; to: Vec; group: number[] }): Model {
  const { grip, to, group } = drag;
  const g = whole(m);
  let after = dragged(g, grip, to, { angle: null, group });
  if (grip.type === 'node') {
    const drop = dropOf(e.editor.loaded!(), to, new Set([grip.node, ...group]), reachOf(false, 1));
    if (drop) after = droppedNode(after, grip.node, drop, null).graph;
  }
  return {
    rows: rowsOf(g, after, m).rows,
    next: { node: after.nextNodeId, edge: after.nextEdgeId },
  };
}

/** One drag on the editor and the model: the model after it, or null when nothing could be held or it changed nothing. */
async function drag(e: Harness, op: Op, m: Model, rand: Dice): Promise<Model | null> {
  if (!m.rows.nodes.length) return null;
  const from = startOf(op, m, rand);
  const to = { x: from.x + rand(120) - 60, y: from.y + rand(120) - 60 };
  // Less than `DRAG_PX` on the screen is a click, not a drag.
  if (Math.hypot(to.x - from.x, to.y - from.y) < DRAG_PX + 1) return null;
  if (!interactable(e.editor.loaded!(), to, reachOf(false, 1))) return null;
  const grip = gripOf(e.press.pickAt(at(from.x, from.y)));
  if (!grip) return null;
  const group =
    op === 'group' && grip.type === 'node'
      ? m.rows.nodes
          .slice(0, 2)
          .map((n) => n[0])
          .filter((id) => id !== grip.node)
      : [];
  // The group is selected without a step, as a box leaves it, and the node held with it, so the selection does not change.
  e.editor.follow(new Set(grip.type === 'node' ? [grip.node, ...group] : []));
  // The point as the editor finds it from the screen (to the last bit of a float).
  const next = expected(e, m, { grip, to: screenToWorld(view, size, at(to.x, to.y)), group });
  e.move.grab(grip, at(from.x, from.y), false);
  e.move.move(at(to.x, to.y), true);
  e.move.up();
  return JSON.stringify(next.rows) === JSON.stringify(m.rows) ? null : next;
}

async function oneRun(
  make: () => ProjectStorage,
  rand: Dice,
  run: number,
  done: Record<Op, number>,
) {
  const start = randomMap(rand);
  globalThis.indexedDB = new IDBFactory();
  const e = await editing(start.nodes, start.edges, [], make());
  let m: Model = { rows: start, next: e.editor.ids!() };
  const h: Stacks = { past: [], future: [] };
  for (let step = 0; step < 12; step++) {
    const op = OPS[rand(OPS.length)]!;
    m =
      op === 'undo' || op === 'redo'
        ? await moved(e, op, m, h)
        : await dragged_({ e, h, rand }, op, m);
    done[op]++;
    await idle(e);
    const label = `run ${run} step ${step} ${op}`;
    await checkAgainst(e, m.rows, label);
    expect(e.editor.history.past.length, label).toBe(h.past.length);
  }
}

interface Stacks {
  past: Model[];
  future: Model[];
}

/** Undo or redo on the editor and the model; the next ids never go back. */
async function moved(e: Harness, op: 'undo' | 'redo', m: Model, h: Stacks): Promise<Model> {
  const [from, to] = op === 'undo' ? [h.past, h.future] : [h.future, h.past];
  const back = from.pop();
  await (op === 'undo' ? e.editor.undo() : e.editor.redo());
  if (!back) return m;
  to.push(m);
  return { ...back, next: m.next };
}

/** A drag on the editor and the model; the selection the drag needed is gone after it. */
async function dragged_(
  { e, h, rand }: { e: Harness; h: Stacks; rand: Dice },
  op: Op,
  m: Model,
): Promise<Model> {
  const next = await drag(e, op, m, rand);
  e.editor.follow(new Set());
  if (!next) return m;
  h.past.push(m);
  h.future.length = 0;
  return next;
}

describe.each([
  ['memory', () => new MemoryStorage(), 30],
  ['IndexedDB', () => new IndexedDbStorage(), 6],
] as const)(
  'the editor against a model of moving on the whole map (^1265), %s',
  (_, make, runs) => {
    it('after every drag, undo and redo the storage, the index and the chunks are what the model says', async () => {
      const rand = dice(1265);
      const done: Record<Op, number> = { node: 0, group: 0, handle: 0, undo: 0, redo: 0 };
      for (let run = 0; run < runs; run++) await oneRun(make, rand, run, done);
      for (const op of Object.keys(done) as Op[]) expect(done[op]).toBeGreaterThan(runs / 2);
    }, 300_000);
  },
);

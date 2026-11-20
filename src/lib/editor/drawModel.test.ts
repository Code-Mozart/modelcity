import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { screenToWorld } from '../camera/view';
import { pointOn } from '../curves/piece';
import { curveOf } from '../map/curve';
import { interactable, segmentAt } from '../map/hit';
import { IndexedDbStorage } from '../project/indexedDb';
import { MemoryStorage, type ProjectStorage } from '../project/storage';
import { at, editing, size, view } from '../testing/editHarness';
import { checkAgainst, dice, type Dice, randomMap } from '../testing/editModel';
import { clicked, finished, type DrawModel, type Under } from '../testing/drawModel';
import { NOT_DRAWING } from './drawing';
import { reachOf } from './pick';
import type { RowHandle } from './handles';

globalThis.IDBKeyRange = IDBKeyRange;

type Harness = Awaited<ReturnType<typeof editing>>;
type Op = 'void' | 'node' | 'segment' | 'finish' | 'undo' | 'redo';
const OPS: Op[] = ['void', 'void', 'node', 'node', 'segment', 'finish', 'undo', 'redo'];

const idle = async (e: Harness) => {
  for (let i = 0; i < 200 && (e.editor.busy || i < 3); i++)
    await new Promise((r) => setTimeout(r, 0));
};

/** A point of the screen for the operation: on a node, on a curve, or anywhere. */
function pointFor(op: Op, m: DrawModel, rand: Dice) {
  if (op === 'node' && m.rows.nodes.length) {
    const n = m.rows.nodes[rand(m.rows.nodes.length)]!;
    return at(n[1] / 1000, n[2] / 1000);
  }
  if (op === 'segment' && m.rows.edges.length) {
    const e = m.rows.edges[rand(m.rows.edges.length)]!;
    const [p, q] = [e[1], e[2]].map((id) => m.rows.nodes.find((n) => n[0] === id)!);
    const piece = curveOf(e, p!, q!).pieces[0]!;
    const s = pointOn(piece, 0.3 + rand(40) / 100);
    return at(s.x, s.y);
  }
  return at(rand(800) - 400, rand(800) - 400);
}

/** What the editor finds under a point, as the model takes it. */
function underOf(e: Harness, pt: { x: number; y: number }): Under | null {
  const hover = e.draw.pickAt(pt);
  const world = screenToWorld(view, size, pt);
  // Where the map is not loaded nothing is placed (a curve can bulge out of the chunks that are).
  if (!interactable(e.editor.loaded!(), world, reachOf(false, view.scale))) return null;
  // A click on a radius point is a click on the curve there (^278); on any other control point it places nothing.
  if (hover?.kind === 'handle') return radiusUnder(e, hover.handle);
  if (hover?.kind === 'node') return { kind: 'node', id: hover.id };
  if (hover?.kind === 'segment') {
    const hit = segmentAt(e.editor.loaded!(), world, reachOf(false, view.scale))!;
    return { kind: 'segment', edge: hit.edge[0], at: hit.at };
  }
  return { kind: 'void', pt: world };
}

function radiusUnder(e: Harness, h: RowHandle): Under | null {
  if (h.type !== 'rad') return null;
  const map = e.editor.loaded!();
  const row = map.edgesAt(h.nodes[0]).find((x) => x[0] === h.edge)!;
  const piece = curveOf(row, map.nodeOf(h.nodes[0])!, map.nodeOf(h.nodes[1])!).pieces[h.k]!;
  return { kind: 'segment', edge: h.edge, at: pointOn(piece, h.t) };
}

const sameStep = (a: DrawModel, b: DrawModel) =>
  JSON.stringify([a.rows, a.draw.active, a.draw.end]) ===
  JSON.stringify([b.rows, b.draw.active, b.draw.end]);

interface Run {
  e: Harness;
  h: History;
  rand: Dice;
}

class History {
  past: DrawModel[] = [];
  future: DrawModel[] = [];
}

/** Undo or redo, on the editor and the model: the road drawn goes back with the rows; the next ids never go back. */
async function moved({ e, h }: Run, op: 'undo' | 'redo', m: DrawModel) {
  const [from, to] = op === 'undo' ? [h.past, h.future] : [h.future, h.past];
  const back = from.pop();
  await (op === 'undo' ? e.editor.undo() : e.editor.redo());
  if (!back) return m;
  to.push(m);
  return { ...back, next: m.next, split: null };
}

/** One operation on the editor and the model: the model after it. */
async function operate({ e, h, rand }: Run, op: Op, m: DrawModel) {
  if (op === 'undo' || op === 'redo') return moved({ e, h, rand }, op, m);
  let next: DrawModel | null;
  if (op === 'finish') {
    next = finished(m);
    await e.editor.rightClick(null, false);
  } else {
    const pt = pointFor(op, m, rand);
    const under = underOf(e, pt);
    next = under && clicked(m, under, false);
    e.draw.down(pt, false);
    e.draw.up();
  }
  if (!next || sameStep(next, m)) return next ?? m;
  h.past.push(m);
  h.future.length = 0;
  return next;
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
  e.editor.enterDraw();
  let m: DrawModel = { rows: start, draw: NOT_DRAWING, next: e.editor.ids!(), split: null };
  const h = new History();
  for (let step = 0; step < 14; step++) {
    const op = OPS[rand(OPS.length)]!;
    m = await operate({ e, h, rand }, op, m);
    done[op]++;
    await idle(e);
    const label = `run ${run} step ${step} ${op}`;
    await checkAgainst(e, m.rows, label);
    expect([e.editor.draw.active, e.editor.draw.end], label).toEqual([m.draw.active, m.draw.end]);
    expect([e.editor.history.past.length, e.editor.history.future.length], label).toEqual([
      h.past.length,
      h.future.length,
    ]);
  }
}

describe.each([
  ['memory', () => new MemoryStorage(), 30],
  ['IndexedDB', () => new IndexedDbStorage(), 6],
] as const)(
  'the editor against a model of drawing on the whole map (^1263), %s',
  (_, make, runs) => {
    it('after every click, finish, undo and redo the storage, the index, the chunks and the road drawn are what the model says', async () => {
      const rand = dice(1263);
      const done: Record<Op, number> = {
        void: 0,
        node: 0,
        segment: 0,
        finish: 0,
        undo: 0,
        redo: 0,
      };
      for (let run = 0; run < runs; run++) await oneRun(make, rand, run, done);
      for (const op of Object.keys(done) as Op[]) expect(done[op]).toBeGreaterThan(runs / 2);
    }, 300_000);
  },
);

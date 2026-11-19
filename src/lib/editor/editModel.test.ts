import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { IndexedDbStorage } from '../project/indexedDb';
import { MemoryStorage, type ProjectStorage } from '../project/storage';
import { editing } from '../testing/editHarness';
import { after, checkAgainst, dice, type Dice, randomMap, Stacks } from '../testing/editModel';

globalThis.IDBKeyRange = IDBKeyRange;

type Op = 'nodes' | 'segment' | 'branch' | 'undo' | 'redo';
const OPS: Op[] = ['nodes', 'nodes', 'segment', 'branch', 'undo', 'redo'];

type Harness = Awaited<ReturnType<typeof editing>>;

/** One delete on the editor, as the model says it goes; false if the model had nothing to delete. */
async function delete_(e: Harness, stacks: Stacks, op: 'nodes' | 'segment' | 'branch', rand: Dice) {
  const next = after(op, stacks.now.rows, rand);
  if (!next) return false;
  if (op === 'nodes') await e.editor.delete({ kind: 'nodes', ids: next.ids, name: 'delete nodes' });
  else if (op === 'segment')
    await e.editor.delete({ kind: 'segments', edges: [next.edge!], name: 'delete segment' });
  else await e.editor.delete({ kind: 'branch', edge: next.edge!, name: 'delete branch' });
  // A delete that changes nothing is no step.
  if (JSON.stringify(next.rows) !== JSON.stringify(stacks.now.rows)) {
    stacks.took({ rows: next.rows, selection: [] });
    return true;
  }
  return false;
}

/** One run: random operations on the editor and on the model, the storage, index and chunks checked after each. */
async function oneRun(
  make: () => ProjectStorage,
  rand: Dice,
  run: number,
  done: { deletes: number; undos: number },
) {
  const start = randomMap(rand);
  if (!start.nodes.length) return;
  globalThis.indexedDB = new IDBFactory();
  const e = await editing(start.nodes, start.edges, [], make());
  const stacks = new Stacks(start);
  for (let step = 0; step < 12; step++) {
    const op = OPS[rand(OPS.length)]!;
    if (op === 'undo' && stacks.undo()) {
      await e.editor.undo();
      done.undos++;
    } else if (op === 'redo' && stacks.redo()) await e.editor.redo();
    else if (op !== 'undo' && op !== 'redo' && (await delete_(e, stacks, op, rand))) done.deletes++;
    await e.settle();
    await checkAgainst(e, stacks.now.rows, `run ${run} step ${step} ${op}`);
    expect([e.editor.history.past.length, e.editor.history.future.length]).toEqual([
      stacks.past.length,
      stacks.future.length,
    ]);
  }
}

describe.each([
  ['memory', () => new MemoryStorage(), 40],
  ['IndexedDB', () => new IndexedDbStorage(), 8],
] as const)(
  'the editor against the model of main, random deletes, undos and redos (^1259, ^1260), %s',
  (_, make, runs) => {
    it('after every operation the storage, the index and the chunks in memory are what the model says', async () => {
      const rand = dice(2026);
      const done = { deletes: 0, undos: 0 };
      for (let run = 0; run < runs; run++) await oneRun(make, rand, run, done);
      // The runs did something of each kind: a test that does nothing proves nothing.
      expect(done.deletes).toBeGreaterThan(runs * 2);
      expect(done.undos).toBeGreaterThan(runs / 2);
    }, 300_000);
  },
);

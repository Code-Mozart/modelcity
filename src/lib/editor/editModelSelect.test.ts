import { describe, expect, it } from 'vitest';
import { editing } from '../testing/editHarness';
import { dice, type Dice, randomMap, rowsOf, Stacks } from '../testing/editModel';
import { removeNodesRef } from '../testing/mainRemoval';

type Harness = Awaited<ReturnType<typeof editing>>;

/** Select some of the nodes there are: a step if the selection changes. */
function select(e: Harness, stacks: Stacks, rand: Dice) {
  const nodes = stacks.now.rows.nodes;
  const picked = [
    ...new Set(Array.from({ length: rand(4) }, () => nodes[rand(nodes.length)]![0])),
  ].sort((a, b) => a - b);
  e.editor.select(new Set(picked));
  if (JSON.stringify(picked) !== JSON.stringify(stacks.now.selection))
    stacks.took({ ...stacks.now, selection: picked });
}

async function remove(e: Harness, stacks: Stacks, rand: Dice) {
  const nodes = stacks.now.rows.nodes;
  const id = nodes[rand(nodes.length)]![0];
  await e.editor.delete({ kind: 'nodes', ids: [id], name: 'delete node' });
  const rows = removeNodesRef(stacks.now.rows, [id]);
  stacks.took({
    rows: {
      nodes: [...rows.nodes].sort((a, b) => a[0] - b[0]),
      edges: [...rows.edges].sort((a, b) => a[0] - b[0]),
    },
    selection: [],
  });
}

/** One of: select, delete a node, undo, redo (or nothing, if there is nothing to do). */
async function operate(e: Harness, stacks: Stacks, rand: Dice) {
  const choice = rand(5);
  const has = stacks.now.rows.nodes.length > 0;
  if (choice === 0 && has) select(e, stacks, rand);
  else if (choice === 1 && has) await remove(e, stacks, rand);
  else if (choice === 2 && stacks.undo()) await e.editor.undo();
  else if (choice === 3 && stacks.redo()) await e.editor.redo();
}

describe('selection steps among the deletes, undone and done again one step at a time (^1257, ^1260)', () => {
  it('the rows, the selection and the history are what the model says after every operation', async () => {
    const rand = dice(77);
    for (let run = 0; run < 25; run++) {
      const start = randomMap(rand);
      if (!start.nodes.length) continue;
      const e = await editing(start.nodes, start.edges);
      const stacks = new Stacks(start);
      for (let step = 0; step < 14; step++) {
        await operate(e, stacks, rand);
        await e.settle();
        const label = `run ${run} step ${step}`;
        expect(await rowsOf(e.storage), label).toEqual(stacks.now.rows);
        expect(
          [...e.editor.selection].sort((a, b) => a - b),
          `selection, ${label}`,
        ).toEqual(stacks.now.selection);
        expect([e.editor.history.past.length, e.editor.history.future.length], label).toEqual([
          stacks.past.length,
          stacks.future.length,
        ]);
      }
    }
  }, 300_000);
});

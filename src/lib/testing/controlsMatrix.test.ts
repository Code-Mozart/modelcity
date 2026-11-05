import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runMatrix, runOne, targetsOf, freshEditor } from './controlsMatrix';
import { groupRows, rowsToMarkdown } from './controlsMatrixRows';

/**
 * The controls matrix (^371): drives the editor over the combinations and lists what each input
 * did. The small checks always run; the whole matrix runs only when asked for:
 *
 *   CONTROLS_MATRIX_OUT=/some/dir bunx vitest run src/lib/testing/controlsMatrix.test.ts
 *
 * It writes `matrix.json` (every try) and `matrix.md` (the rows, without hats) to that directory.
 */
const project = readFileSync(new URL('./fixtures/combinations.json', import.meta.url), 'utf8');
const out = process.env.CONTROLS_MATRIX_OUT;

describe('controls matrix', () => {
  it('a click on the void in select mode enters draw mode', () => {
    const probe = freshEditor(project, 'select');
    const t = targetsOf(probe, 'no parallel segments', 0, 0).find((x) => x.under === 'void')!;
    const r = runOne(project, {
      mode: 'select',
      t,
      sel: ['nothing', []],
      mod: 'none',
      action: 'click',
      pinned: [],
    });
    expect(r.phase).toBe('draw');
    expect(r.hint).toBe('LMB: draw mode');
  });

  it('modifiers that do the same are one row', () => {
    const probe = freshEditor(project, 'select');
    const t = targetsOf(probe, 'no parallel segments', 0, 0).find((x) => x.under === 'node')!;
    const recs = ['Alt', 'Shift'].map((mod) =>
      runOne(project, { mode: 'select', t, sel: ['nothing', []], mod, action: 'rmb', pinned: [] }),
    );
    const rows = groupRows(recs);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.any.mod).toBe(true);
    expect(rowsToMarkdown(rows)).toContain('delete node');
  });

  it.skipIf(!out)(
    'writes the whole matrix',
    () => {
      const recs = runMatrix(project);
      writeFileSync(`${out}/matrix.json`, JSON.stringify(recs));
      writeFileSync(`${out}/matrix.md`, rowsToMarkdown(groupRows(recs)));
      expect(recs.length).toBeGreaterThan(1000);
    },
    240_000,
  );
});

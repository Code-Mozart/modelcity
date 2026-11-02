import { ESC, ENTER, hint, mouse, type Hint } from '../hints/hints';

/** What the projects modal is doing, for its hints: nothing special, renaming, or asking about a delete. */
export type ModalMode = 'list' | 'rename' | 'delete';

/** What the pointer is over in the projects modal (nothing: null). */
export type ModalTarget =
  | 'card'
  | 'rename'
  | 'delete'
  | 'confirm'
  | 'cancel'
  | 'close'
  | 'new'
  | 'import'
  | 'export'
  | 'search';

const CLICK: Record<ModalTarget, (mode: ModalMode) => string> = {
  card: () => 'open',
  rename: () => 'rename',
  delete: () => 'delete',
  confirm: (mode) => (mode === 'rename' ? 'rename' : 'delete'),
  cancel: () => 'cancel',
  close: () => 'close',
  new: () => 'new project',
  import: () => 'import',
  export: () => 'export JSON',
  search: () => 'search',
};

const ESC_TEXT: Record<ModalMode, string> = { list: 'close', rename: 'cancel', delete: 'cancel' };

/** Rows with the same text become one row with all their inputs, keys before the mouse (`Esc or LMB: cancel`). */
function merged(rows: Hint[]): Hint[] {
  const out: Hint[] = [];
  for (const row of rows) {
    const same = out.find((r) => r.text === row.text);
    if (same) same.inputs.push(...row.inputs);
    else out.push({ ...row, inputs: [...row.inputs] });
  }
  for (const r of out)
    r.inputs.sort((a, b) => Number(a.kind === 'mouse') - Number(b.kind === 'mouse'));
  return out;
}

/**
 * The controls while the projects modal is up (^168): they replace all others, which do not work
 * meanwhile. Like all hints they say what an input does right now, as briefly as is clear (^181):
 * the click is only there over something that can be clicked, and what two inputs do alike is one row.
 */
export function modalHints(mode: ModalMode, over: ModalTarget | null = null): Hint[] {
  const rows: Hint[] = [];
  if (over) rows.push(hint(mouse('lmb'), CLICK[over](mode)));
  if (mode === 'rename') rows.push(hint(ENTER, 'rename'));
  rows.push(hint(ESC, ESC_TEXT[mode]));
  return merged(rows);
}

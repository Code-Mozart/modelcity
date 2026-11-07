import { hintsOf, type Control } from '../hints/controls';
import { ESC, ENTER, mouse } from '../hints/inputs';
import type { Hint } from '../hints/hints';

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

/** What the projects modal is doing and what the pointer is over: the facts its controls depend on. */
export interface ModalFacts {
  mode: ModalMode;
  over: ModalTarget | null;
}

type ModalControl = Control<ModalFacts>;

/** The click over something that can be clicked (^733 to ^739, ^403 to ^407): one row per target. */
const click = (
  hat: number,
  over: ModalTarget,
  says: (mode: ModalMode) => string,
): ModalControl => ({
  hat,
  input: mouse('lmb'),
  on: (f) => f.over === over,
  listens: () => true,
  says: (f) => says(f.mode),
});

const ESC_TEXT: Record<ModalMode, string> = { list: 'close', rename: 'cancel', delete: 'cancel' };

/** The controls while the projects modal is up (^168), in the order of the hints. */
export const MODAL_CONTROLS: ModalControl[] = [
  click(733, 'card', () => 'open'),
  click(734, 'rename', () => 'rename'),
  click(737, 'delete', () => 'delete'),
  click(735, 'confirm', (mode) => (mode === 'rename' ? 'rename' : 'delete')),
  click(736, 'cancel', () => 'cancel'),
  click(403, 'close', () => 'close'),
  click(406, 'new', () => 'new project'),
  click(404, 'import', () => 'import'),
  click(405, 'export', () => 'export JSON'),
  click(407, 'search', () => 'search'),
  {
    hat: 773,
    input: ENTER,
    on: (f) => f.mode === 'rename',
    listens: () => true,
    says: () => 'rename',
  },
  { hat: 401, input: ESC, on: () => true, listens: () => true, says: (f) => ESC_TEXT[f.mode] },
];

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
 * The hints while the projects modal is up (^168): the controls replace all others, which do not
 * work meanwhile. Like all hints they say what an input does right now, as briefly as is clear
 * (^181): the click is only there over something that can be clicked, and what two inputs do alike
 * is one row.
 */
export function modalHints(mode: ModalMode, over: ModalTarget | null = null): Hint[] {
  return merged(hintsOf(MODAL_CONTROLS, { mode, over }));
}

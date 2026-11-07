import { hint, type Input } from './inputs';
import type { ControlId, Hint } from './hints';

/**
 * Controls as data (^783): one row per control, in one table per area. A row says what the control
 * is (its hat, its input), **where it exists** (`on`), **when it listens** (the editor does something
 * with the input there: checked against the handlers by `controls.test.ts`), and **what its hint
 * says** (null: no hint here, because it adds nothing to another row, or by design). The hints are
 * made from the rows and nothing else says what they are; the order of the rows is the order of the hints.
 */
export interface Control<F> {
  /** The hat of the control (`docs/controls.md`, ^392). */
  hat: number;
  /** The input, or inputs that do the same (the hint shows them as one row). */
  input: Input | Input[];
  /** The control whose hint is hidden for a while after it was used (^110). */
  id?: ControlId;
  /** Where the control exists: the mode, what is under the pointer, the state. */
  on: (f: F) => boolean;
  /** Whether the editor does anything with the input there (within `on`). */
  listens: (f: F) => boolean;
  /** What the hint says, or null where there is none. */
  says: (f: F) => string | null;
  /** What a held key changes, shown after the hint (`(Alt to undo batch)`). */
  note?: { key: string; text: string };
}

/** The hints of the controls that exist in a state and have one, in the order of the table. */
export function hintsOf<F>(controls: Control<F>[], f: F): Hint[] {
  return controls.flatMap((c) => {
    const text = c.on(f) ? c.says(f) : null;
    if (text === null) return [];
    return [{ ...hint(c.input, text, c.id), ...(c.note ? { note: c.note } : {}) }];
  });
}

import type { Input } from './inputs';

export type { Input } from './inputs';

/** The controls whose hints are hidden after the user used them, each on its own (^110). Rebuilt with the operations (^1232). */
export type ControlId = 'pan' | 'zoom' | 'rotate';

/** A control hint: the inputs (alternatives) and what they do, e.g. [Esc] or [RMB]: finish. */
export interface Hint {
  inputs: Input[];
  text: string;
  /** The control, if it can be learned: its hint is hidden for a while after it was used (^110). */
  id?: ControlId;
  /** What a held key changes: `(Alt to undo batch)`. */
  note?: { key: string; text: string };
}

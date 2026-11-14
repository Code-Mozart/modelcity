import type { ControlId, Hint } from './hints';

/** One way of operating the mouse or keyboard, shown as a symbol (^49). */
export type Input =
  | { kind: 'mouse'; button: 'lmb' | 'mmb' | 'rmb'; drag?: boolean; shift?: boolean; alt?: boolean }
  | { kind: 'wheel' }
  | { kind: 'key'; label: string }
  /** Keys pressed together, e.g. Ctrl+Z. */
  | { kind: 'keys'; labels: string[] };

export const mouse = (
  button: 'lmb' | 'mmb' | 'rmb',
  drag = false,
  mod?: 'shift' | 'alt' | 'alt+shift',
): Input => ({
  kind: 'mouse',
  button,
  drag,
  shift: mod === 'shift' || mod === 'alt+shift',
  alt: mod === 'alt' || mod === 'alt+shift',
});
export const hint = (input: Input | Input[], text: string, id?: ControlId): Hint => ({
  inputs: Array.isArray(input) ? input : [input],
  text,
  ...(id ? { id } : {}),
});

export const ESC: Input = { kind: 'key', label: 'Esc' };
export const ENTER: Input = { kind: 'key', label: 'Enter' };

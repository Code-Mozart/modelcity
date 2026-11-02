/** The one place where keys are bound to editor actions (^11), so they are easy to change. */
export type Action =
  'escape' | 'view' | 'pin' | 'deleteNode' | 'undo' | 'redo' | 'undoBatch' | 'redoBatch';

const KEYMAP: Record<string, Action> = {
  Escape: 'escape',
  Tab: 'view',
  s: 'pin',
  S: 'pin',
  Delete: 'deleteNode',
  Backspace: 'deleteNode',
};

export interface KeyMods {
  ctrl: boolean;
  shift: boolean;
  alt?: boolean;
}

/**
 * Ctrl+Z undoes; Ctrl+Y or Ctrl+Shift+Z redoes (^81). With Alt as well they undo and redo a whole
 * batch (^103). Ctrl also means Cmd.
 */
export function actionFor(key: string, { ctrl, shift, alt = false }: KeyMods): Action | undefined {
  if (!ctrl) return KEYMAP[key];
  const k = key.toLowerCase();
  const redo = k === 'y' || (k === 'z' && shift);
  if (!redo && k !== 'z') return undefined;
  if (alt) return redo ? 'redoBatch' : 'undoBatch';
  return redo ? 'redo' : 'undo';
}

/** The key of a key event; with Alt held, the letter of the physical key (Alt+Z types another character on a Mac). */
export function keyOf(e: { key: string; code: string; altKey: boolean }): string {
  return e.altKey && e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key;
}

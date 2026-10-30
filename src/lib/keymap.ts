/** The one place where keys are bound to editor actions (^11), so they are easy to change. */
export type Action = 'finishRoad' | 'deleteNode' | 'undo' | 'redo';

export const KEYMAP: Record<string, Action> = {
  Escape: 'finishRoad',
  Delete: 'deleteNode',
  Backspace: 'deleteNode',
};

export interface KeyMods {
  ctrl: boolean;
  shift: boolean;
}

/** Ctrl+Z undoes; Ctrl+Y or Ctrl+Shift+Z redoes (^81). Ctrl also means Cmd. */
export function actionFor(key: string, { ctrl, shift }: KeyMods): Action | undefined {
  if (!ctrl) return KEYMAP[key];
  const k = key.toLowerCase();
  if (k === 'y' || (k === 'z' && shift)) return 'redo';
  return k === 'z' ? 'undo' : undefined;
}

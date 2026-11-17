import type { Editor } from './editor.svelte';
import { actionFor, keyOf, type Action } from './keymap';

type KeyEventLike = {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

const DO: Record<Action, (editor: Editor) => void> = {
  escape: (e) => e.mode === 'select' && e.deselectAll(),
  view: (e) => e.toggleMode(),
  undo: (e) => e.undo(),
  redo: (e) => e.redo(),
  undoBatch: (e) => e.undo(true),
  redoBatch: (e) => e.redo(true),
};

/** What a key does in the editor: the action, or null if it was not one of its keys (the page then uses it, ^11). */
export function editorKey(editor: Editor, e: KeyEventLike): Action | null {
  const action = actionFor(keyOf(e), {
    ctrl: e.ctrlKey || e.metaKey,
    shift: e.shiftKey,
    alt: e.altKey,
  });
  if (!action) return null;
  DO[action](editor);
  return action;
}

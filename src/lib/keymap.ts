/** The one place where keys are bound to editor actions (^11), so they are easy to change. */
export type Action = 'finishRoad' | 'deleteNode';

export const KEYMAP: Record<string, Action> = {
  Escape: 'finishRoad',
  Delete: 'deleteNode',
  Backspace: 'deleteNode',
};

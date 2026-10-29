/** The one place where keys are bound to editor actions (^11), so they are easy to change. */
export type Action = 'toolMove' | 'toolAppend' | 'toolInsert' | 'deleteNode';

export const KEYMAP: Record<string, Action> = {
  m: 'toolMove',
  Escape: 'toolMove',
  a: 'toolAppend',
  i: 'toolInsert',
  Delete: 'deleteNode',
  Backspace: 'deleteNode',
};

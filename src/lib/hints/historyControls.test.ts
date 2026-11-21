import { describe, expect, it } from 'vitest';
import { Editor } from '../editor/editor.svelte';
import { editorKey } from '../editor/keys';
import { HISTORY_CONTROLS, historyHints } from './historyControls';

const key = (k: string, mods: object = {}) => ({
  key: k,
  code: k,
  ctrlKey: true,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

/** Each control of the table, done on the real thing (^783). */
const DOES: Record<number, () => unknown> = {
  454: () => {
    const editor = new Editor();
    editor.select(new Set([1]));
    editorKey(editor, key('z'));
    return editor.selection.size === 0;
  },
  456: () => {
    const editor = new Editor();
    editor.select(new Set([1]));
    editor.undo();
    editorKey(editor, key('y'));
    return editor.selection.size === 1;
  },
};

describe('undo and redo, the hints of the recent history panel (^454, ^456, ^109)', () => {
  it.each(HISTORY_CONTROLS.map((c) => [c.hat]))('control ^%i does what its hint says', (hat) => {
    expect(DOES[hat]!()).toBe(true);
  });

  it('every control of the table has such a scenario, and no other has one', () => {
    expect(Object.keys(DOES).map(Number).sort()).toEqual(HISTORY_CONTROLS.map((c) => c.hat).sort());
  });

  it('show only what there is to do, with the Alt note only for a batch of more than one step (^418)', () => {
    expect(historyHints({ undo: false, redo: false })).toEqual([]);
    const both = historyHints({ undo: true, redo: true, undoBatch: true });
    expect(both.map((h) => h.text)).toEqual(['undo', 'redo']);
    expect(both[0]!.note).toEqual({ key: 'Alt', text: 'to undo batch' });
    expect(both[1]!.note).toBeUndefined();
  });

  it('are hidden for a while after they were used (^110)', () => {
    const state = { undo: true, redo: true };
    expect(historyHints(state, (id) => id === 'undo').map((h) => h.text)).toEqual(['redo']);
  });
});

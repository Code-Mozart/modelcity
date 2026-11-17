import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { editorKey } from './keys';

const press = (
  key: string,
  mods: Partial<{ ctrl: boolean; shift: boolean; alt: boolean }> = {},
) => ({
  key,
  code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
  ctrlKey: !!mods.ctrl,
  metaKey: false,
  shiftKey: !!mods.shift,
  altKey: !!mods.alt,
});

describe('the keys of the editor (^11, ^81, ^103, ^218, ^394)', () => {
  it('Esc deselects all in select mode, and does nothing in view mode', () => {
    const editor = new Editor();
    editor.select(new Set([1, 2]));
    editor.toggleMode();
    expect(editorKey(editor, press('Escape'))).toBe('escape');
    expect(editor.selection.size).toBe(2);
    editor.toggleMode();
    editorKey(editor, press('Escape'));
    expect(editor.selection.size).toBe(0);
  });

  it('Tab switches between select mode and view mode', () => {
    const editor = new Editor();
    editorKey(editor, press('Tab'));
    expect(editor.mode).toBe('view');
    editorKey(editor, press('Tab'));
    expect(editor.mode).toBe('select');
  });
});

describe('the history keys (^81, ^103, ^397, ^398)', () => {
  it('Ctrl+Z undoes, Ctrl+Y and Ctrl+Shift+Z redo, with Alt a whole batch', () => {
    const editor = new Editor();
    for (const s of [[1], [1, 2], [1, 2, 3]]) editor.select(new Set(s));
    editorKey(editor, press('z', { ctrl: true }));
    expect(editor.selection.size).toBe(2);
    editorKey(editor, press('y', { ctrl: true }));
    expect(editor.selection.size).toBe(3);
    editorKey(editor, press('z', { ctrl: true, alt: true }));
    expect(editor.selection.size).toBe(0);
    editorKey(editor, press('z', { ctrl: true, shift: true, alt: true }));
    expect(editor.selection.size).toBe(3);
  });

  it('says so when there is nothing to undo or redo (^397, ^398)', () => {
    const editor = new Editor();
    const told: string[] = [];
    editor.told = (_, text) => told.push(text);
    editorKey(editor, press('z', { ctrl: true }));
    editorKey(editor, press('y', { ctrl: true }));
    expect(told).toEqual(['nothing to undo', 'nothing to redo']);
  });

  it('leaves the other keys to the page', () => {
    expect(editorKey(new Editor(), press('q'))).toBeNull();
    expect(editorKey(new Editor(), press('z'))).toBeNull();
  });
});

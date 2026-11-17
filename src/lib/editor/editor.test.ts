import { describe, expect, it } from 'vitest';
import { emptyGraph } from '../model/graph';
import { Editor } from './editor.svelte';

const sel = (...ids: number[]) => new Set(ids);

describe('the editor: mode, selection and its history (^1257)', () => {
  it('starts in select mode with nothing selected, and Tab-like toggling goes to view mode and back', () => {
    const editor = new Editor();
    expect(editor.mode).toBe('select');
    expect(editor.selection.size).toBe(0);
    editor.toggleMode();
    expect(editor.mode).toBe('view');
    editor.toggleMode();
    expect(editor.mode).toBe('select');
  });

  it('leaving select mode takes the hover and the box away, and keeps the selection', () => {
    const editor = new Editor();
    editor.select(sel(1));
    editor.hover = { kind: 'node', id: 4 };
    editor.band = { a: { x: 0, y: 0 }, b: { x: 5, y: 5 } };
    editor.toggleMode();
    expect([editor.hover, editor.band]).toEqual([null, null]);
    expect([...editor.selection]).toEqual([1]);
  });

  it('a selection is a step that is named, a selection that changes nothing is not', () => {
    const editor = new Editor();
    editor.select(sel(1, 2));
    editor.select(sel(1, 2));
    editor.select(sel(2));
    expect(editor.history.past.map((s) => s.name)).toEqual(['select 2 nodes', 'deselect node']);
  });
});

describe('the history of the editor (^1257)', () => {
  it('undoes and redoes, one step or a batch, and a new step forgets what was undone', () => {
    const editor = new Editor();
    for (const s of [sel(1), sel(1, 2), sel(3)]) editor.select(s);
    editor.undo();
    expect([...editor.selection]).toEqual([1, 2]);
    editor.undo(true);
    expect(editor.selection.size).toBe(0);
    editor.redo(true);
    expect([...editor.selection].sort()).toEqual([3]);
    editor.undo();
    editor.select(sel(9));
    expect(editor.history.future).toEqual([]);
  });

  it('a box follows the nodes inside it and takes one step, from what was selected before it', () => {
    const editor = new Editor();
    editor.select(sel(5));
    const before = editor.selection;
    editor.follow(sel(5, 1));
    editor.follow(sel(5, 1, 2));
    expect(editor.history.past).toHaveLength(1);
    editor.select(editor.selection, before);
    expect(editor.history.past.map((s) => s.name)).toEqual(['select node', 'select 2 nodes']);
    editor.undo();
    expect([...editor.selection]).toEqual([5]);
  });
});

describe('the selection that goes (^1257)', () => {
  it('deselect all is a step, and only when something is selected', () => {
    const editor = new Editor();
    editor.deselectAll();
    expect(editor.history.past).toHaveLength(0);
    editor.select(sel(1));
    editor.deselectAll();
    expect(editor.history.past.map((s) => s.name)).toEqual(['select node', 'deselect all']);
  });

  it('a selection that cannot stay is dropped with its history; another project starts with nothing', () => {
    const editor = new Editor();
    editor.select(sel(1));
    editor.dropSelection();
    expect(editor.selection.size).toBe(0);
    expect(editor.history.past).toEqual([]);
    editor.select(sel(2));
    editor.load(emptyGraph());
    expect([editor.selection.size, editor.history.past.length]).toEqual([0, 0]);
  });
});

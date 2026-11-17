import type { Editor } from '../editor/editor.svelte';
import type { SelectFacts } from './selectControls';

/** What the hints of select mode need to know of the editor (^181). */
export function selectFactsOf(editor: Editor): SelectFacts {
  const { hover, selection: sel } = editor;
  return {
    mode: editor.mode,
    hovered: hover?.kind ?? null,
    hoveredSelected:
      hover?.kind === 'node'
        ? sel.has(hover.id)
        : hover?.kind === 'segment' && hover.nodes.every((id) => sel.has(id)),
    selected: sel.size,
    canUndo: editor.history.past.length > 0,
    canRedo: editor.history.future.length > 0,
  };
}

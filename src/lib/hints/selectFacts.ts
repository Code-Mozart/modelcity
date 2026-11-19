import { branchOf } from '../editor/branchOf';
import type { Editor } from '../editor/editor.svelte';
import { onSelection } from '../editor/deleting';
import { allSelected } from '../editor/selection';
import type { LoadedMap } from '../map/hit';
import { networkOf } from '../map/network';
import type { SelectFacts } from './selectControls';

/** What the hints of select mode need to know of the editor (^181). */
export function selectFactsOf(editor: Editor, map: LoadedMap): SelectFacts {
  const { hover, selection: sel } = editor;
  return {
    mode: editor.mode,
    hovered: hover?.kind ?? null,
    hoveredSelected:
      hover?.kind === 'node'
        ? sel.has(hover.id)
        : hover?.kind === 'segment' && hover.nodes.every((id) => sel.has(id)),
    selected: sel.size,
    onSelection: onSelection(sel, hover),
    branchSelected: hover !== null && allSelected(sel, branchOf(networkOf(map), hover).nodes),
  };
}

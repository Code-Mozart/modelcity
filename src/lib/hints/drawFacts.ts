import { leafWay, nodeAction } from '../editor/drawing';
import type { Editor } from '../editor/editor.svelte';
import type { LoadedMap } from '../map/hit';
import type { DrawFacts } from './drawControls';

/** What the hints of draw and extend mode need to know of the editor (^181, ^1262). */
export function drawFactsOf(editor: Editor, map: LoadedMap): DrawFacts {
  const { hover, draw } = editor;
  const degree = (id: number) => map.edgesAt(id).length;
  const node = hover?.kind === 'node' ? hover.id : null;
  return {
    drawing: editor.mode === 'draw',
    extending: draw.active !== null,
    firstNodeOnly: draw.active !== null && degree(draw.active) === 0,
    backwards: draw.end === 'start',
    hovered: hover?.kind ?? null,
    act: node === null ? null : nodeAction(draw, node, degree),
    way: node === null ? null : leafWay(map.edgesAt(node).filter((e) => e[1] === node).length),
  };
}

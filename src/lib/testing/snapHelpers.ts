import { Editor } from '../editor/editor.svelte';
import { addEdge, addNode, emptyGraph, type Graph } from '../model/graph';
import { at } from './editorHelpers';

/** A map of straight roads: each road is a list of points along y with heading 0. */
export function mapOf(roads: [number, number][][]): Graph {
  let g = emptyGraph();
  for (const road of roads) {
    const ids = road.map(([x, y]) => {
      const r = addNode(g, { x, y, th: 0 });
      g = r.graph;
      return r.id;
    });
    ids.slice(1).forEach((id, i) => (g = addEdge(g, ids[i]!, id, null)));
  }
  return g;
}

export const snapping = (x: number, y: number) => at(x, y, { ctrl: false });

export const drag = (ed: Editor, from: [number, number], to: [number, number]) => {
  ed.pointerDown(snapping(...from));
  ed.pointerMove(snapping(from[0] + 8, from[1] + 8));
  ed.pointerMove(snapping(...to));
  ed.pointerUp();
};

export function drawMode(g: Graph) {
  const ed = new Editor();
  ed.load(g);
  ed.enterDrawMode();
  return ed;
}

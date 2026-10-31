import type { Path } from '../curves/path';
import { addEdge, addNode, emptyGraph, type Graph } from '../model/graph';

/** Test fixtures only: a graph made of separate chains from paths (the demo's example paths are paths). */
export function graphOfPaths(paths: Path[]): Graph {
  let g = emptyGraph();
  for (const path of paths) {
    const ids = path.nodes.map((n) => {
      const r = addNode(g, n);
      g = r.graph;
      return r.id;
    });
    ids.slice(1).forEach((id, i) => (g = addEdge(g, ids[i]!, id, path.radii[i] ?? null)));
  }
  return g;
}

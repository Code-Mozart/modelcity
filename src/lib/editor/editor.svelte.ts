import { emptyGraph, type Graph } from '../model/graph';

/**
 * The map in memory (^1232): the graph, the clone of what a project stores. It is only ever behind
 * the storage by the autosave delay (`ProjectSession`). Everything that was made from it, and
 * every operation on it, was taken out (^1232) and is built again one operation at a time.
 */
export class Editor {
  graph = $state.raw<Graph>(emptyGraph());

  /** Replace the map by that of a project. */
  load(graph: Graph) {
    this.graph = graph;
  }
}

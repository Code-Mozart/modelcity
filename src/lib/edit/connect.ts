import type { Editor } from '../editor/editor.svelte';
import type { LoadedMap } from '../map/hit';
import type { MapMemory } from '../map/mapMemory.svelte';
import type { IndexChange, MapChange, ProjectStorage } from '../project/storage';
import { toMapChange } from './change';
import { affectedChunks, indexChangeOf } from './indexChange';

/**
 * What the editor changes the map with (^1260): an operation reads the rows it works on from the
 * storage, a change is written to the storage with what it does to the index in one step, and then
 * the chunks in memory are brought up to date (what is gone at once, what changed read again).
 */
export function connectEditor(
  editor: Editor,
  {
    storage,
    memory,
    project,
    commit,
  }: {
    storage: ProjectStorage;
    memory: MapMemory;
    /** The id of the open project. */
    project: () => string;
    /** Writes a change to the storage with what it does to the index (the session also keeps its header and date). */
    commit: (change: MapChange, index: IndexChange) => Promise<void>;
  },
) {
  editor.loaded = (): LoadedMap => ({
    chunks: memory.chunks,
    nodeOf: memory.index.nodeOf,
    edgesAt: memory.index.edgesAt,
  });
  editor.source = () => ({
    nodes: (ids) => storage.nodesByIds(project(), ids),
    edgesAt: (ids) => storage.edgesOf(project(), ids),
  });
  editor.writer = async (change) => {
    const map = toMapChange(change);
    await commit(map, indexChangeOf(change));
    memory.edited({ nodes: map.removedNodes, edges: map.removedEdges }, affectedChunks(change));
  };
}

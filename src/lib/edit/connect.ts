import type { Editor } from '../editor/editor.svelte';
import type { MapMemory } from '../map/mapMemory.svelte';
import type { IndexChange, MapChange, ProjectStorage } from '../project/storage';
import { toMapChange, type RowChange } from './change';
import { withFreshContext } from './context';
import { affectedChunks, indexChangeOf } from './indexChange';
import { patchOf } from '../map/chunkPatch';

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
  editor.loaded = () => memory.loaded();
  editor.source = () => ({
    nodes: (ids) => storage.nodesByIds(project(), ids),
    edgesAt: (ids) => storage.edgesOf(project(), ids),
  });
  editor.writer = async (made) => {
    const change = await withFreshContext(made, (ids) => storage.nodesByIds(project(), ids));
    const w = written(change);
    await commit(w.map, w.index);
    memory.edited(w.patch, w.touched);
  };
}

/** What a change is when it is written: its rows, what it does to the index, and to the chunks in memory (^1262). */
export function written(change: RowChange) {
  const map = toMapChange(change);
  const index = indexChangeOf(change);
  return {
    map,
    index,
    patch: patchOf(map, index, change.context),
    touched: affectedChunks(change),
  };
}

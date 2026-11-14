import type { Graph } from '../model/graph';
import { mapChange, toFile, toHeader, type Project } from './file';
import type { ProjectStorage } from './storage';

/** Write a project: a project that is in the storage gets its header and what changed on its map (`was` is the map as stored); one that is not gets everything. */
export const persist = (storage: ProjectStorage, id: string, was: Graph | null, p: Project) =>
  was
    ? storage.patch(id, toHeader(p), mapChange(was, p.graph))
    : storage.put({ id, file: toFile(p) });

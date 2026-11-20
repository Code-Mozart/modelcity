import type { Graph } from '../model/graph';
import { INDEX_VERSION } from '../map/segmentIndex';
import { uid } from './browserMemory';
import { mapChange, toFile, toHeader, type Project } from './file';
import type { Header, MapChange, ProjectStorage } from './storage';

/**
 * The header to write for a project: one that was opened keeps what is stored of it (the lane
 * configurations, the id counters) and takes the title, the dates and the camera of the session;
 * the counters never go back, whatever the map in memory says (it may hold none of the map, ^1236).
 */
export function headerFor(p: Project, stored: Header | null): Header {
  const fresh = toHeader(p);
  if (!stored) return fresh;
  const { title, createdAt, lastUpdatedAt, camera } = fresh;
  return {
    ...stored,
    title,
    createdAt,
    lastUpdatedAt,
    camera,
    nextNodeId: Math.max(stored.nextNodeId, fresh.nextNodeId),
    nextEdgeId: Math.max(stored.nextEdgeId, fresh.nextEdgeId),
  };
}

/** Write a project: a project that is in the storage gets its header and what changed on its map (`was` is the map as stored); one that is not gets everything. */
export const persist = (
  storage: ProjectStorage,
  id: string,
  { was, project, header }: { was: Graph | null; project: Project; header: Header },
) =>
  was
    ? storage.patch(id, header, mapChange(was, project.graph))
    : storage.put({ id, file: { ...toFile(project), ...header } });

/** The header with id counters past every id that a change writes (^1224): an id is never given twice. */
export function withIdsOf(change: MapChange, header: Header): Header {
  const past = (rows: [number, ...unknown[]][], next: number) =>
    rows.reduce((m, r) => Math.max(m, r[0] + 1), next);
  return {
    ...header,
    nextNodeId: past(change.nodes, header.nextNodeId),
    nextEdgeId: past(change.edges, header.nextEdgeId),
  };
}

/** A project with no rows and a complete index (the index of nothing), in the list of projects: what a blank map becomes at its first change (^189, ^1263). */
export async function createEmpty(storage: ProjectStorage, p: Project) {
  const id = uid();
  const header = headerFor(p, null);
  await storage.create(id, header);
  await storage.markIndexed(id, INDEX_VERSION);
  return { id, header };
}

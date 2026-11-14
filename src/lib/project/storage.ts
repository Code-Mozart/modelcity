import type { ProjectFile } from './file';

/** A project without its map: what a list of projects needs (title, dates, camera, lane configurations, id counters). */
export type Header = Omit<ProjectFile, 'nodes' | 'edges'>;
export type NodeRow = ProjectFile['nodes'][number];
export type EdgeRow = ProjectFile['edges'][number];

/** A whole project kept in the browser: the id of its record (not part of the file) and the project as in an export file (^165). */
export interface StoredProject {
  id: string;
  file: ProjectFile;
}

/** A project of the list: its header only, the map is read when the project is opened. */
export interface StoredHeader {
  id: string;
  file: Header;
}

/** What changed on the map of a project: the nodes and segments that are new or different, and the ids of those that are gone. */
export interface MapChange {
  nodes: NodeRow[];
  edges: EdgeRow[];
  removedNodes: number[];
  removedEdges: number[];
}

export interface ProjectStorage {
  /** The headers of all projects. */
  list(): Promise<StoredHeader[]>;
  /** One project as the object of its file, not checked yet (^229), or undefined if there is none. */
  load(id: string): Promise<unknown>;
  /** Write a whole project, replacing what was there. */
  put(project: StoredProject): Promise<void>;
  /** Write the header of a stored project and, if given, what changed on its map. Only that is written. */
  patch(id: string, header: Header, change?: MapChange): Promise<void>;
  remove(id: string): Promise<void>;
}

export const headerOf = (file: ProjectFile | Header): Header =>
  Object.fromEntries(
    Object.entries(file).filter(([k]) => k !== 'nodes' && k !== 'edges'),
  ) as Header;

function mergeRows<R extends [number, ...unknown[]]>(
  rows: R[],
  changed: R[],
  removed: number[],
): R[] {
  const gone = new Set(removed);
  const now = new Map(changed.map((r) => [r[0], r]));
  const kept = rows.filter((r) => !gone.has(r[0])).map((r) => now.get(r[0]) ?? r);
  const have = new Set(kept.map((r) => r[0]));
  return [...kept, ...changed.filter((r) => !have.has(r[0]))];
}

/** A stored project with a change applied: the rows keep their places, new ones come last. */
export function applyChange(file: ProjectFile, header: Header, change?: MapChange): ProjectFile {
  const { nodes, edges } = file;
  if (!change) return { ...header, nodes, edges };
  return {
    ...header,
    nodes: mergeRows(nodes, change.nodes, change.removedNodes),
    edges: mergeRows(edges, change.edges, change.removedEdges),
  };
}

/** For tests, and for a browser without IndexedDB. */
export class MemoryStorage implements ProjectStorage {
  private items = new Map<string, StoredProject>();

  async list() {
    return [...this.items.values()].map((p) => ({ id: p.id, file: headerOf(p.file) }));
  }

  async load(id: string) {
    const p = this.items.get(id);
    return p && structuredClone(p.file);
  }

  async put(project: StoredProject) {
    this.items.set(project.id, structuredClone(project));
  }

  async patch(id: string, header: Header, change?: MapChange) {
    const p = this.items.get(id);
    if (p) this.items.set(id, { id, file: structuredClone(applyChange(p.file, header, change)) });
  }

  async remove(id: string) {
    this.items.delete(id);
  }
}

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
  /** The header of one project, or undefined if there is none. Reads no part of the map. */
  header(id: string): Promise<Header | undefined>;
  /** One whole project as the object of its file, not checked yet (^229), or undefined if there is none. */
  load(id: string): Promise<unknown>;
  /** Write a whole project, replacing what was there. */
  put(project: StoredProject): Promise<void>;
  /** Write the header of a stored project and, if given, what changed on its map. Only that is written. */
  patch(id: string, header: Header, change?: MapChange): Promise<void>;
  remove(id: string): Promise<void>;
  /** The nodes of a project inside a box (millimeters, both ends included): the part of the map that is looked at. */
  nodesIn(id: string, box: BoxMm, read?: ReadOptions): Promise<NodeRow[]>;
  /** The nodes with these ids. */
  nodesByIds(id: string, ids: number[]): Promise<NodeRow[]>;
  /** The segments that start or end at one of these nodes. */
  edgesOf(id: string, nodeIds: number[]): Promise<EdgeRow[]>;
}

/** What a long read can be asked: to say how far it is (rows looked at, of rows to look at), and to stop (it then fails with an `AbortError`). */
export interface ReadOptions {
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

/** A box in millimeters, the unit of what is stored. */
export interface BoxMm {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
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

  async header(id: string) {
    const p = this.items.get(id);
    return p && structuredClone(headerOf(p.file));
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

  async nodesIn(id: string, b: BoxMm, { onProgress, signal }: ReadOptions = {}) {
    signal?.throwIfAborted();
    const inBox = ([, x, y]: NodeRow) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
    const rows = this.items.get(id)?.file.nodes.filter(inBox) ?? [];
    onProgress?.(rows.length, rows.length);
    return rows;
  }

  async nodesByIds(id: string, ids: number[]) {
    const want = new Set(ids);
    return this.items.get(id)?.file.nodes.filter((n) => want.has(n[0])) ?? [];
  }

  async edgesOf(id: string, nodeIds: number[]) {
    const want = new Set(nodeIds);
    return this.items.get(id)?.file.edges.filter((e) => want.has(e[1]) || want.has(e[2])) ?? [];
  }
}

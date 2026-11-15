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
  /**
   * The segment index of a project (^1239), derived from its nodes and segments, never stored with
   * the project: how much of it there is, for a version of the derivation.
   */
  indexStatus(id: string, version: number): Promise<IndexStatus>;
  /** The next `limit` segments after the one with id `after`, in the order of their ids. */
  edgesAfter(id: string, after: number, limit: number): Promise<EdgeRow[]>;
  /** Which of these segments have a record of this version. */
  indexedIds(id: string, ids: number[], version: number): Promise<Set<number>>;
  /** Write records of the segment index (in one step: all or none). */
  putIndex(id: string, version: number, records: IndexRecord[]): Promise<void>;
  /** Throw the segment index of a project away. */
  clearIndex(id: string): Promise<void>;
  /** The segments the index lists for a chunk (their boxes touch it), with the wide ones. Needs a complete index of this version. */
  edgesInChunk(id: string, cx: number, cy: number, version: number): Promise<EdgeRow[]>;
}

/** What a long read can be asked: to say how far it is (rows looked at, of rows to look at), and to stop (it then fails with an `AbortError`). */
export interface ReadOptions {
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

/**
 * One segment in the segment index (^1239): the box round its curve (millimeters, whole numbers,
 * left, top, right, bottom) and the chunks that box covers (cell coordinates); `'wide'` for a box
 * of so many chunks that the segment is returned for every chunk instead of being listed in each.
 */
export interface IndexRecord {
  id: number;
  box: [number, number, number, number];
  cells: [number, number][] | 'wide';
}

/** How much of a project's segment index there is: the segments, and the records of the asked version. */
export interface IndexStatus {
  segments: number;
  indexed: number;
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
  private index = new Map<string, Map<number, { version: number; record: IndexRecord }>>();

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
    this.index.delete(project.id);
  }

  /** A change of the map makes the segment index of the project stale: it is thrown away (until the edits keep it current, ^1243). */
  async patch(id: string, header: Header, change?: MapChange) {
    const p = this.items.get(id);
    if (!p) return;
    this.items.set(id, { id, file: structuredClone(applyChange(p.file, header, change)) });
    if (
      change &&
      (change.nodes.length ||
        change.edges.length ||
        change.removedNodes.length ||
        change.removedEdges.length)
    )
      this.index.delete(id);
  }

  async remove(id: string) {
    this.items.delete(id);
    this.index.delete(id);
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

  async indexStatus(id: string, version: number) {
    const records = [...(this.index.get(id)?.values() ?? [])];
    return {
      segments: this.items.get(id)?.file.edges.length ?? 0,
      indexed: records.filter((r) => r.version === version).length,
    };
  }

  async edgesAfter(id: string, after: number, limit: number) {
    const edges = this.items.get(id)?.file.edges ?? [];
    return edges
      .filter((e) => e[0] > after)
      .sort((a, b) => a[0] - b[0])
      .slice(0, limit);
  }

  async indexedIds(id: string, ids: number[], version: number) {
    const records = this.index.get(id);
    return new Set(ids.filter((n) => records?.get(n)?.version === version));
  }

  async putIndex(id: string, version: number, records: IndexRecord[]) {
    const held = this.index.get(id) ?? new Map();
    records.forEach((record) => held.set(record.id, { version, record: structuredClone(record) }));
    this.index.set(id, held);
  }

  async clearIndex(id: string) {
    this.index.delete(id);
  }

  async edgesInChunk(id: string, cx: number, cy: number, version: number) {
    const listed = [...(this.index.get(id)?.values() ?? [])]
      .filter((r) => r.version === version)
      .filter(
        ({ record }) =>
          record.cells === 'wide' || record.cells.some(([x, y]) => x === cx && y === cy),
      )
      .map(({ record }) => record.id);
    const want = new Set(listed);
    return this.items.get(id)?.file.edges.filter((e) => want.has(e[0])) ?? [];
  }
}

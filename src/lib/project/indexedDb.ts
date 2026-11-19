import type {
  EdgeRow,
  Header,
  IndexChange,
  IndexRecord,
  IndexStatus,
  MapChange,
  NodeCell,
  NodeRow,
  ProjectStorage,
  StoredProject,
} from './storage';
import { applyChange, headerOf } from './storage';
import type { ProjectFile } from './file';
import { DB, DB_VERSION, CELLS, EDGES, NODES, PROJECTS, SEGMENTS, upgrade } from './idbSchema';
import { deleteIds, done, edge, node, ofProject, request, rowsByIds } from './idbRows';

/**
 * A project is a record of `projects` with its header (the list reads only these), and one record
 * for each node and each segment, found by project and id. Nodes can also be found by project and
 * x, and by project and y; segments by project and start, and by project and end node: a part of
 * the map is read without reading the rest. There are no chunks in what is stored. A record of the
 * first layout (`{id, file}`: the whole file in one record) is read as before and written in this
 * layout when it is read.
 */
type Stored = { id: string; header: Header; index?: number } | { id: string; file: ProjectFile };

const changes = (c: MapChange) =>
  c.nodes.length + c.edges.length + c.removedNodes.length + c.removedEdges.length > 0;

const isRows = (v: unknown) => Array.isArray(v) && v.every(Array.isArray);

/** IndexedDB, in the layout above. */
export class IndexedDbStorage implements ProjectStorage {
  private db: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const open = indexedDB.open(DB, DB_VERSION);
      open.onupgradeneeded = () => upgrade(open.result, open.transaction!);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    return this.db;
  }

  private async tx(mode: IDBTransactionMode) {
    return (await this.open()).transaction([PROJECTS, NODES, EDGES, SEGMENTS, CELLS], mode);
  }

  async list() {
    const tx = await this.tx('readonly');
    const all = await request<Stored[]>(tx.objectStore(PROJECTS).getAll());
    return all.map((r) => ({ id: r.id, file: 'header' in r ? r.header : headerOf(r.file) }));
  }

  /** The header of a project; one of the first layout is written in this layout first, so that its map can be asked about. */
  async header(id: string) {
    const tx = await this.tx('readonly');
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    if (!r) return undefined;
    if ('header' in r) return r.header;
    await this.convert(r.file, id);
    return headerOf(r.file);
  }

  async load(id: string) {
    const tx = await this.tx('readonly');
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    if (!r) return undefined;
    if ('file' in r) return this.convert(r.file, id);
    const [nodes, edges] = await Promise.all([
      request(tx.objectStore(NODES).getAll(ofProject(id))),
      request(tx.objectStore(EDGES).getAll(ofProject(id))),
    ]);
    return {
      ...r.header,
      nodes: nodes.map((n) => [n.id, n.x, n.y, n.th]),
      edges: edges.map((e) => [e.id, e.start, e.end, e.radius, e.lane]),
    };
  }

  /** A project of the first layout is written in this one when it is read, so that it can be asked about its map; the file is what was read. */
  private async convert(file: ProjectFile, id: string) {
    if (isRows(file.nodes) && isRows(file.edges)) await this.put({ id, file });
    return file;
  }

  async put({ id, file }: StoredProject) {
    const tx = await this.tx('readwrite');
    this.write(tx, id, file);
    await done(tx);
  }

  async append(id: string, rows: { nodes: NodeRow[]; edges: EdgeRow[] }) {
    const tx = await this.tx('readwrite');
    const [nodes, edges] = [tx.objectStore(NODES), tx.objectStore(EDGES)];
    rows.nodes.forEach((n) => nodes.add(node(id, n)));
    rows.edges.forEach((e) => edges.add(edge(id, e)));
    await done(tx);
  }

  async create(id: string, header: Header) {
    const tx = await this.tx('readwrite');
    tx.objectStore(PROJECTS).put({ id, header });
    await done(tx);
  }

  async patch(id: string, header: Header, change?: MapChange, index?: IndexChange) {
    const tx = await this.tx('readwrite');
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    if (!r) return;
    if ('file' in r) this.write(tx, id, applyChange(r.file, header, change));
    else this.patchRows(tx, r, { header, change, index });
    await done(tx);
  }

  /** The header and the change of a project in the layout with rows; the index stays if the map did not change, or the change says what to do with the index and it is complete (^1260), else it is thrown away. */
  private patchRows(
    tx: IDBTransaction,
    r: Extract<Stored, { header: Header }>,
    { header, change, index }: { header: Header; change?: MapChange; index?: IndexChange },
  ) {
    const changed = change !== undefined && changes(change);
    const keeps = !changed || (index !== undefined && r.index === index.version);
    tx.objectStore(PROJECTS).put({
      id: r.id,
      header,
      ...(keeps && r.index ? { index: r.index } : {}),
    });
    if (!change || !changed) return;
    if (keeps && index) this.updateIndex(tx, r.id, index);
    else this.dropIndex(tx, r.id);
    this.changeRows(tx, r.id, change);
  }

  async remove(id: string) {
    const tx = await this.tx('readwrite');
    this.clear(tx, id);
    tx.objectStore(PROJECTS).delete(id);
    await done(tx);
  }

  async nodesByIds(id: string, ids: number[]) {
    const rows = await rowsByIds<{ id: number; x: number; y: number; th: number }>(
      (await this.tx('readonly')).objectStore(NODES),
      id,
      ids,
    );
    return rows.map((n): NodeRow => [n.id, n.x, n.y, n.th]);
  }

  async edgesOf(id: string, nodeIds: number[]) {
    const store = (await this.tx('readonly')).objectStore(EDGES);
    const found = new Map<number, EdgeRow>();
    const lists = nodeIds.flatMap((n) => [
      request(store.index('start').getAll([id, n])),
      request(store.index('end').getAll([id, n])),
    ]);
    for (const e of (await Promise.all(lists)).flat())
      found.set(e.id, [e.id, e.start, e.end, e.radius, e.lane]);
    return [...found.values()];
  }

  async indexStatus(id: string, version: number): Promise<IndexStatus> {
    const tx = await this.tx('readonly');
    const [segments, indexed, nodes, nodesIndexed] = await Promise.all([
      request(tx.objectStore(EDGES).count(ofProject(id))),
      request(tx.objectStore(SEGMENTS).index('version').count([id, version])),
      request(tx.objectStore(NODES).count(ofProject(id))),
      request(tx.objectStore(CELLS).index('version').count([id, version])),
    ]);
    return { segments, indexed, nodes, nodesIndexed };
  }

  async edgesAfter(id: string, after: number, limit: number) {
    const store = (await this.tx('readonly')).objectStore(EDGES);
    const rows = await request(
      store.getAll(IDBKeyRange.bound([id, after], [id, Infinity], true, false), limit),
    );
    return rows.map((e): EdgeRow => [e.id, e.start, e.end, e.radius, e.lane]);
  }

  async indexedIds(id: string, ids: number[], version: number) {
    const found = await rowsByIds<{ id: number; v: number }>(
      (await this.tx('readonly')).objectStore(SEGMENTS),
      id,
      ids,
    );
    return new Set(found.filter((r) => r.v === version).map((r) => r.id as number));
  }

  async putIndex(id: string, version: number, records: IndexRecord[]) {
    const tx = await this.tx('readwrite');
    const store = tx.objectStore(SEGMENTS);
    for (const r of records) {
      const cells = r.cells === 'wide' ? [[id, 'wide']] : r.cells.map(([cx, cy]) => [id, cx, cy]);
      store.put({ p: id, id: r.id, v: version, box: r.box, cells });
    }
    await done(tx);
  }

  async clearIndex(id: string) {
    const tx = await this.tx('readwrite');
    this.dropIndex(tx, id);
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    if (r && 'header' in r) tx.objectStore(PROJECTS).put({ id, header: r.header });
    await done(tx);
  }

  async indexedVersion(id: string) {
    const tx = await this.tx('readonly');
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    return r && 'header' in r ? r.index : undefined;
  }

  async markIndexed(id: string, version: number) {
    const tx = await this.tx('readwrite');
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    if (r && 'header' in r) tx.objectStore(PROJECTS).put({ ...r, index: version });
    await done(tx);
  }

  async edgesInChunk(id: string, cx: number, cy: number, version: number) {
    const tx = await this.tx('readonly');
    const cell = tx.objectStore(SEGMENTS).index('cell');
    const [here, wide] = await Promise.all([
      request(cell.getAll([id, cx, cy])),
      request(cell.getAll([id, 'wide'])),
    ]);
    const ids = new Set(
      [...here, ...wide].filter((r) => r.v === version).map((r) => r.id as number),
    );
    const rows = await rowsByIds<{
      id: number;
      start: number;
      end: number;
      radius: number | null;
      lane: number;
    }>(tx.objectStore(EDGES), id, [...ids]);
    return rows.map((e): EdgeRow => [e.id, e.start, e.end, e.radius, e.lane]);
  }

  async nodesAfter(id: string, after: number, limit: number) {
    const store = (await this.tx('readonly')).objectStore(NODES);
    const rows = await request(
      store.getAll(IDBKeyRange.bound([id, after], [id, Infinity], true, false), limit),
    );
    return rows.map((n): NodeRow => [n.id, n.x, n.y, n.th]);
  }

  async indexedNodeIds(id: string, ids: number[], version: number) {
    const found = await rowsByIds<{ id: number; v: number }>(
      (await this.tx('readonly')).objectStore(CELLS),
      id,
      ids,
    );
    return new Set(found.filter((r) => r.v === version).map((r) => r.id as number));
  }

  async putNodeCells(id: string, version: number, cells: NodeCell[]) {
    const tx = await this.tx('readwrite');
    const store = tx.objectStore(CELLS);
    for (const {
      node: [n, x, y, th],
      cell,
    } of cells)
      store.put({ p: id, id: n, v: version, x, y, th, cell: [id, cell[0], cell[1]] });
    await done(tx);
  }

  /** The nodes of a chunk: one exact lookup of its cell, nothing round it (^1250). */
  async nodesInChunk(id: string, cx: number, cy: number, version: number) {
    const store = (await this.tx('readonly')).objectStore(CELLS);
    const rows = await request(store.index('cell').getAll([id, cx, cy]));
    return rows.filter((n) => n.v === version).map((n): NodeRow => [n.id, n.x, n.y, n.th]);
  }

  private clear(tx: IDBTransaction, id: string) {
    tx.objectStore(NODES).delete(ofProject(id));
    tx.objectStore(EDGES).delete(ofProject(id));
    this.dropIndex(tx, id);
  }

  /** Bring the index up to date with a change, in the step of the change. */
  private updateIndex(tx: IDBTransaction, id: string, c: IndexChange) {
    const [segments, cells] = [tx.objectStore(SEGMENTS), tx.objectStore(CELLS)];
    deleteIds(segments, id, c.removedSegments);
    deleteIds(cells, id, c.removedNodes);
    for (const r of c.records) {
      const keys = r.cells === 'wide' ? [[id, 'wide']] : r.cells.map(([cx, cy]) => [id, cx, cy]);
      segments.put({ p: id, id: r.id, v: c.version, box: r.box, cells: keys });
    }
    for (const {
      node: [n, x, y, th],
      cell,
    } of c.cells)
      cells.put({ p: id, id: n, v: c.version, x, y, th, cell: [id, cell[0], cell[1]] });
  }

  private dropIndex(tx: IDBTransaction, id: string) {
    tx.objectStore(SEGMENTS).delete(ofProject(id));
    tx.objectStore(CELLS).delete(ofProject(id));
  }

  /** A whole project in the layout; one whose rows are not rows (a damaged file) stays in one record so that it can be refused when opened. */
  private write(tx: IDBTransaction, id: string, file: ProjectFile) {
    this.clear(tx, id);
    if (!isRows(file.nodes) || !isRows(file.edges)) {
      tx.objectStore(PROJECTS).put({ id, file });
      return;
    }
    tx.objectStore(PROJECTS).put({ id, header: headerOf(file) });
    this.changeRows(tx, id, {
      nodes: file.nodes,
      edges: file.edges,
      removedNodes: [],
      removedEdges: [],
    });
  }

  private changeRows(tx: IDBTransaction, id: string, c: MapChange) {
    const [nodes, edges] = [tx.objectStore(NODES), tx.objectStore(EDGES)];
    c.nodes.forEach((n) => nodes.put(node(id, n)));
    c.edges.forEach((e) => edges.put(edge(id, e)));
    deleteIds(nodes, id, c.removedNodes);
    deleteIds(edges, id, c.removedEdges);
  }
}

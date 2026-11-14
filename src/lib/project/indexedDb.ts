import type {
  BoxMm,
  EdgeRow,
  Header,
  MapChange,
  NodeRow,
  ProjectStorage,
  ReadOptions,
  StoredProject,
} from './storage';
import { applyChange, headerOf } from './storage';
import type { ProjectFile } from './file';

const DB = 'modelcity';
const [PROJECTS, NODES, EDGES] = ['projects', 'nodes', 'edges'];
/** A read that can say how far it is says it after this many rows. */
const PROGRESS_STEP = 500;

/**
 * A project is a record of `projects` with its header (the list reads only these), and one record
 * for each node and each segment, found by project and id. Nodes can also be found by project and
 * x, and by project and y; segments by project and start, and by project and end node: a part of
 * the map is read without reading the rest. There are no chunks in what is stored. A record of the
 * first layout (`{id, file}`: the whole file in one record) is read as before and written in this
 * layout when it is read.
 */
type Stored = { id: string; header: Header } | { id: string; file: ProjectFile };

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });

const ofProject = (p: string) => IDBKeyRange.bound([p, -Infinity], [p, Infinity]);

const between = (p: string, lo: number, hi: number) => IDBKeyRange.bound([p, lo], [p, hi]);

const node = (p: string, [id, x, y, th]: NodeRow) => ({ p, id, x, y, th });
const edge = (p: string, [id, start, end, radius, lane]: EdgeRow) => ({
  p,
  id,
  start,
  end,
  radius,
  lane,
});

const isRows = (v: unknown) => Array.isArray(v) && v.every(Array.isArray);

/** IndexedDB, in the layout above. */
export class IndexedDbStorage implements ProjectStorage {
  private db: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const open = indexedDB.open(DB, 2);
      open.onupgradeneeded = () => upgrade(open.result);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    return this.db;
  }

  private async tx(mode: IDBTransactionMode) {
    return (await this.open()).transaction([PROJECTS, NODES, EDGES], mode);
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

  async patch(id: string, header: Header, change?: MapChange) {
    const tx = await this.tx('readwrite');
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    if (!r) return;
    if ('file' in r) this.write(tx, id, applyChange(r.file, header, change));
    else {
      tx.objectStore(PROJECTS).put({ id, header });
      if (change) this.changeRows(tx, id, change);
    }
    await done(tx);
  }

  async remove(id: string) {
    const tx = await this.tx('readwrite');
    this.clear(tx, id);
    tx.objectStore(PROJECTS).delete(id);
    await done(tx);
  }

  /**
   * The nodes in a box: the index on x or the one on y finds them, the one whose range holds fewer
   * (the count is asked of both), and the other coordinate is filtered here (^1228). They are read
   * one by one so that it can say how far it is, and stop (^1241).
   */
  async nodesIn(id: string, b: BoxMm, { onProgress, signal }: ReadOptions = {}) {
    signal?.throwIfAborted();
    const store = (await this.tx('readonly')).objectStore(NODES);
    const [byX, byY] = [store.index('x'), store.index('y')];
    const [rx, ry] = [between(id, b.x0, b.x1), between(id, b.y0, b.y1)];
    const [nx, ny] = await Promise.all([request(byX.count(rx)), request(byY.count(ry))]);
    const [from, range, total] = nx <= ny ? [byX, rx, nx] : [byY, ry, ny];
    return new Promise<NodeRow[]>((resolve, reject) => {
      const rows: NodeRow[] = [];
      let seen = 0;
      const cursor = from.openCursor(range);
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        const at = cursor.result;
        if (signal?.aborted) return reject(signal.reason);
        if (!at) return resolve(rows);
        const n = at.value;
        if (n.x >= b.x0 && n.x <= b.x1 && n.y >= b.y0 && n.y <= b.y1)
          rows.push([n.id, n.x, n.y, n.th]);
        if (++seen % PROGRESS_STEP === 0) onProgress?.(seen, total);
        at.continue();
      };
    }).then((rows) => {
      onProgress?.(total, total);
      return rows;
    });
  }

  async nodesByIds(id: string, ids: number[]) {
    const store = (await this.tx('readonly')).objectStore(NODES);
    const rows = await Promise.all(ids.map((n) => request(store.get([id, n]))));
    return rows.filter((n) => n).map((n): NodeRow => [n.id, n.x, n.y, n.th]);
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

  private clear(tx: IDBTransaction, id: string) {
    tx.objectStore(NODES).delete(ofProject(id));
    tx.objectStore(EDGES).delete(ofProject(id));
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
    c.removedNodes.forEach((n) => nodes.delete([id, n]));
    c.removedEdges.forEach((e) => edges.delete([id, e]));
  }
}

function upgrade(db: IDBDatabase) {
  if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: 'id' });
  const nodes = db.createObjectStore(NODES, { keyPath: ['p', 'id'] });
  nodes.createIndex('x', ['p', 'x']);
  nodes.createIndex('y', ['p', 'y']);
  const edges = db.createObjectStore(EDGES, { keyPath: ['p', 'id'] });
  edges.createIndex('start', ['p', 'start']);
  edges.createIndex('end', ['p', 'end']);
}

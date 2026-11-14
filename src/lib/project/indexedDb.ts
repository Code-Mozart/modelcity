import type { EdgeRow, Header, MapChange, NodeRow, ProjectStorage, StoredProject } from './storage';
import { applyChange, headerOf } from './storage';
import type { ProjectFile } from './file';

const DB = 'modelcity';
const [PROJECTS, NODES, EDGES] = ['projects', 'nodes', 'edges'];

/**
 * A project is a record of `projects` with its header (the list reads only these), and one record
 * for each node and each segment, found by project and id. Nodes can also be found by project and
 * x, and by project and y; segments by project and start, and by project and end node: a part of
 * the map is read without reading the rest. There are no chunks in what is stored. A record of the
 * first layout (`{id, file}`: the whole file in one record) is read as before and written in this
 * layout when it is saved.
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

  async load(id: string) {
    const tx = await this.tx('readonly');
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    if (!r) return undefined;
    if ('file' in r) return r.file;
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

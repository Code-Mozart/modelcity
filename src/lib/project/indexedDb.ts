import type {
  EdgeRow,
  Header,
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
import {
  CELLS,
  DB,
  DB_VERSION,
  EDGE_BLOCKS,
  EDGES,
  NODE_BLOCKS,
  NODES,
  PROJECTS,
  SEGMENTS,
  upgrade,
} from './idbSchema';
import { done, ofProject, request, rowsByIds } from './idbRows';
import {
  blockOf,
  changeBlocks,
  changeRows,
  countRows,
  oldRowsToBlocks,
  rowsAfter,
  rowsOfBlocks,
} from './idbBlocks';

/**
 * A project is a record of `projects` with its header (the list reads only these), and its nodes and
 * segments in blocks of ids (`idbBlocks.ts`, ^1254): a part of the map is read without reading the
 * rest. There are no chunks in what is stored. A record of the first layout (`{id, file}`: the whole
 * file in one record) is read as before and written in this layout when it is read; one of the layout
 * with a record for each row (no `blocks` in it) the same.
 */
type Header_ = { id: string; header: Header; index?: number; blocks?: true };
type Stored = Header_ | { id: string; file: ProjectFile };

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
    const stores = [PROJECTS, NODES, EDGES, SEGMENTS, CELLS, NODE_BLOCKS, EDGE_BLOCKS];
    return (await this.open()).transaction(stores, mode);
  }

  async list() {
    const tx = await this.tx('readonly');
    const all = await request<Stored[]>(tx.objectStore(PROJECTS).getAll());
    return all.map((r) => ({ id: r.id, file: 'header' in r ? r.header : headerOf(r.file) }));
  }

  /** The header of a project; one of an older layout is written in this layout first, so that its map can be asked about. */
  async header(id: string) {
    const tx = await this.tx('readonly');
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    if (!r) return undefined;
    if ('header' in r) {
      if (!r.blocks) await this.toBlocks(r);
      return r.header;
    }
    await this.convert(r.file, id);
    return headerOf(r.file);
  }

  async load(id: string) {
    const tx = await this.tx('readonly');
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    if (!r) return undefined;
    if ('file' in r) return this.convert(r.file, id);
    if (!r.blocks) await this.toBlocks(r);
    const read = await this.tx('readonly');
    const [nodes, edges] = await Promise.all([
      request(read.objectStore(NODE_BLOCKS).getAll(ofProject(id))),
      request(read.objectStore(EDGE_BLOCKS).getAll(ofProject(id))),
    ]);
    return { ...r.header, nodes: rowsOfBlocks(nodes), edges: rowsOfBlocks(edges) };
  }

  /** A project with a record for each row (the layout before the blocks, ^1254) is written in blocks, once. */
  private async toBlocks(r: Header_) {
    const tx = await this.tx('readwrite');
    await oldRowsToBlocks(tx, r.id);
    tx.objectStore(PROJECTS).put({ ...r, blocks: true });
    await done(tx);
    r.blocks = true;
  }

  /** A project of the first layout is written in this one when it is read; the file is what was read. */
  private async convert(file: ProjectFile, id: string) {
    if (isRows(file.nodes) && isRows(file.edges)) await this.put({ id, file });
    return file;
  }

  async put({ id, file }: StoredProject) {
    const tx = await this.tx('readwrite');
    await this.write(tx, id, file);
    await done(tx);
  }

  async append(id: string, rows: { nodes: NodeRow[]; edges: EdgeRow[] }) {
    const tx = await this.tx('readwrite');
    await Promise.all([
      changeBlocks(tx.objectStore(NODE_BLOCKS), id, {
        changed: rows.nodes,
        removed: [],
        ends: false,
        fresh: true,
      }),
      changeBlocks(tx.objectStore(EDGE_BLOCKS), id, {
        changed: rows.edges,
        removed: [],
        ends: true,
        fresh: true,
      }),
    ]).catch((e: unknown) => {
      tx.abort();
      throw e;
    });
    await done(tx).catch(() => undefined);
  }

  async create(id: string, header: Header) {
    const tx = await this.tx('readwrite');
    tx.objectStore(PROJECTS).put({ id, header, blocks: true });
    await done(tx);
  }

  async patch(id: string, header: Header, change?: MapChange) {
    const tx = await this.tx('readwrite');
    const r = await request<Stored | undefined>(tx.objectStore(PROJECTS).get(id));
    if (!r) return;
    if ('file' in r) await this.write(tx, id, applyChange(r.file, header, change));
    else {
      // The mark that the index is complete stays unless the map changes.
      const changed = change !== undefined && changes(change);
      tx.objectStore(PROJECTS).put({
        id,
        header,
        blocks: true,
        ...(!changed && r.index ? { index: r.index } : {}),
      });
      if (change && changed) {
        // A change of the map makes the index stale: it is thrown away (until the edits keep it current, ^1243).
        this.dropIndex(tx, id);
        await changeRows(tx, id, change);
      }
    }
    await done(tx);
  }

  async remove(id: string) {
    const tx = await this.tx('readwrite');
    this.clear(tx, id);
    tx.objectStore(PROJECTS).delete(id);
    await done(tx);
  }

  async nodesByIds(id: string, ids: number[]) {
    const store = (await this.tx('readonly')).objectStore(NODE_BLOCKS);
    const blocks = await rowsByIds<{ id: number; rows: NodeRow[] }>(store, id, ids.map(blockOf));
    const want = new Set(ids);
    return rowsOfBlocks(blocks).filter((n) => want.has(n[0]));
  }

  async edgesOf(id: string, nodeIds: number[]) {
    const store = (await this.tx('readonly')).objectStore(EDGE_BLOCKS);
    const blocks = await Promise.all(
      nodeIds.map((n) => request<{ rows: EdgeRow[] }[]>(store.index('ends').getAll([id, n]))),
    );
    const want = new Set(nodeIds);
    const found = new Map<number, EdgeRow>();
    for (const e of rowsOfBlocks(blocks.flat()))
      if (want.has(e[1]) || want.has(e[2])) found.set(e[0], e);
    return [...found.values()];
  }

  async indexStatus(id: string, version: number): Promise<IndexStatus> {
    const tx = await this.tx('readonly');
    const [segments, indexed, nodes, nodesIndexed] = await Promise.all([
      countRows(tx.objectStore(EDGE_BLOCKS), id),
      request(tx.objectStore(SEGMENTS).index('version').count([id, version])),
      countRows(tx.objectStore(NODE_BLOCKS), id),
      request(tx.objectStore(CELLS).index('version').count([id, version])),
    ]);
    return { segments, indexed, nodes, nodesIndexed };
  }

  async edgesAfter(id: string, after: number, limit: number) {
    return rowsAfter<EdgeRow>(
      (await this.tx('readonly')).objectStore(EDGE_BLOCKS),
      id,
      after,
      limit,
    );
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
    if (r && 'header' in r) tx.objectStore(PROJECTS).put({ id, header: r.header, blocks: true });
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
    const blocks = await rowsByIds<{ id: number; rows: EdgeRow[] }>(
      tx.objectStore(EDGE_BLOCKS),
      id,
      [...ids].map(blockOf),
    );
    return rowsOfBlocks(blocks).filter((e) => ids.has(e[0]));
  }

  async nodesAfter(id: string, after: number, limit: number) {
    return rowsAfter<NodeRow>(
      (await this.tx('readonly')).objectStore(NODE_BLOCKS),
      id,
      after,
      limit,
    );
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
    for (const s of [NODES, EDGES, NODE_BLOCKS, EDGE_BLOCKS])
      tx.objectStore(s).delete(ofProject(id));
    this.dropIndex(tx, id);
  }

  private dropIndex(tx: IDBTransaction, id: string) {
    tx.objectStore(SEGMENTS).delete(ofProject(id));
    tx.objectStore(CELLS).delete(ofProject(id));
  }

  /** A whole project in the layout; one whose rows are not rows (a damaged file) stays in one record so that it can be refused when opened. */
  private async write(tx: IDBTransaction, id: string, file: ProjectFile) {
    this.clear(tx, id);
    if (!isRows(file.nodes) || !isRows(file.edges)) {
      tx.objectStore(PROJECTS).put({ id, file });
      return;
    }
    tx.objectStore(PROJECTS).put({ id, header: headerOf(file), blocks: true });
    await changeRows(tx, id, {
      nodes: file.nodes,
      edges: file.edges,
      removedNodes: [],
      removedEdges: [],
    });
  }
}

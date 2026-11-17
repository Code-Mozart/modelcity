export const DB = 'modelcity';
/** The version of the database (^1250): it only says which stores and indexes there are, the version of what a project is is in its header. */
export const DB_VERSION = 4;
export const [PROJECTS, NODES, EDGES, SEGMENTS, CELLS] = [
  'projects',
  'nodes',
  'edges',
  'segments',
  'nodecells',
];

/** Make the stores and indexes that a database of an older version lacks, and take away those that are not used any more. */
export function upgrade(db: IDBDatabase, tx: IDBTransaction) {
  if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: 'id' });
  if (!db.objectStoreNames.contains(NODES)) db.createObjectStore(NODES, { keyPath: ['p', 'id'] });
  // The strips of the indexes on x and on y are no longer how the nodes of a chunk are found (^1250): they only took room.
  const nodes = tx.objectStore(NODES);
  for (const name of ['x', 'y']) if (nodes.indexNames.contains(name)) nodes.deleteIndex(name);
  if (!db.objectStoreNames.contains(EDGES)) {
    const edges = db.createObjectStore(EDGES, { keyPath: ['p', 'id'] });
    edges.createIndex('start', ['p', 'start']);
    edges.createIndex('end', ['p', 'end']);
  }
  if (!db.objectStoreNames.contains(SEGMENTS)) {
    // The segment index (^1239): one record per segment with the box round its curve; `cell` finds the segments of a chunk.
    const segments = db.createObjectStore(SEGMENTS, { keyPath: ['p', 'id'] });
    segments.createIndex('cell', 'cells', { multiEntry: true });
    segments.createIndex('version', ['p', 'v']);
  }
  if (!db.objectStoreNames.contains(CELLS)) {
    // The nodes by the chunk they are in, with their rows (^1250): derived, built with the segment index.
    const cells = db.createObjectStore(CELLS, { keyPath: ['p', 'id'] });
    cells.createIndex('cell', 'cell');
    cells.createIndex('version', ['p', 'v']);
  }
}

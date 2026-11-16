import { FILE_VERSION, type ProjectFile } from './file';
import { TopLevelReader } from './jsonRows';
import {
  checkCounterValues,
  checkEdgeRow,
  checkLane,
  checkNodeRow,
  migrate,
  refuse,
  validateHeader,
} from './migrate';
import type { EdgeRow, Header, NodeRow, ProjectStorage } from './storage';

/** What an import reports while it goes: the rows written so far. */
export interface ImportProgress {
  nodes: number;
  edges: number;
}

/** What is known of the map while it is read: the ids and numbers that the checks at the end need, never the rows. */
class Tally {
  nodeIds = new Set<number>();
  ends: number[] = [];
  lanes = new Set<number>();
  maxNode = -1;
  maxEdge = -1;
  edges = 0;
}

const isDuplicate = (e: unknown) => e instanceof Error && e.name === 'ConstraintError';

async function writeNodes(storage: ProjectStorage, id: string, rows: unknown[], t: Tally) {
  const nodes = rows.map((r, i) => {
    checkNodeRow(r, t.nodeIds.size + i);
    return r as NodeRow;
  });
  for (const n of nodes) {
    if (t.nodeIds.has(n[0])) refuse('damaged', '^204', 'two nodes have the same id');
    t.nodeIds.add(n[0]);
    t.maxNode = Math.max(t.maxNode, n[0]);
  }
  await storage.append(id, { nodes, edges: [] });
}

async function writeEdges(storage: ProjectStorage, id: string, rows: unknown[], t: Tally) {
  const edges = rows.map((r, i) => {
    checkEdgeRow(r, t.edges + i);
    return r as EdgeRow;
  });
  for (const e of edges) {
    t.ends.push(e[1], e[2]);
    t.lanes.add(e[4]);
    t.maxEdge = Math.max(t.maxEdge, e[0]);
  }
  t.edges += edges.length;
  try {
    await storage.append(id, { nodes: [], edges });
  } catch (e) {
    if (isDuplicate(e)) refuse('damaged', '^205', 'two edges have the same id');
    throw e;
  }
}

/** The checks that need the whole map (^204 to ^207), made when it is all read. */
function checkWhole(head: Record<string, unknown>, t: Tally) {
  const lanes = head.laneConfigurations as Record<string, unknown>;
  for (const lane of t.lanes)
    if (lanes[lane] === undefined)
      refuse('damaged', '^207', `an edge uses lane configuration ${lane}, which does not exist`);
  for (const end of t.ends)
    if (!t.nodeIds.has(end))
      refuse('damaged', '^206', `an edge runs to node ${end}, which does not exist`);
}

/**
 * Reads a project file in pieces and writes its map to the storage as it goes (^1256): the rows go
 * out in batches, so that of a big file only a piece, the ids and the header are in memory at any
 * time. The project is created (and so listed) only when everything was read and checked; a file
 * that is refused leaves rows behind that the caller removes (`ProjectStorage.remove`). The result
 * is the header of the project. The checks are those of `readProject` (^229).
 */
export async function importStream(
  storage: ProjectStorage,
  id: string,
  pieces: AsyncIterable<string>,
  onProgress?: (p: ImportProgress) => void,
): Promise<Header> {
  const reader = new TopLevelReader(new Set(['nodes', 'edges']));
  const head: Record<string, unknown> = {};
  const t = new Tally();
  const seen = new Set<string>();
  const handle = async (found: ReturnType<TopLevelReader['push']>) => {
    for (const f of found) {
      if (!('rows' in f)) {
        head[f.key] = f.value;
        // A file that is too new or no project is refused before its map is read.
        if (f.key === 'version') migrate({ version: f.value }, FILE_VERSION, { 1: (x) => x });
      } else if (f.key === 'nodes') await writeNodes(storage, id, f.rows, t);
      else await writeEdges(storage, id, f.rows, t);
      if ('rows' in f) seen.add(f.key);
      onProgress?.({ nodes: t.nodeIds.size, edges: t.edges });
    }
  };
  try {
    for await (const piece of pieces) await handle(reader.push(piece));
    await handle(reader.end());
  } catch (e) {
    if (e instanceof SyntaxError)
      refuse('not-project', '^192', `the file is not valid JSON (${e.message})`);
    throw e;
  }
  if (!seen.has('nodes') || !seen.has('edges'))
    refuse('damaged', '^199', '"nodes" and "edges" must be lists');
  return finish(storage, id, head, t);
}

async function finish(
  storage: ProjectStorage,
  id: string,
  head: Record<string, unknown>,
  t: Tally,
) {
  // The counters of a version 1 file are made from the ids by its migration: it is shown them as rows.
  const shown = (largest: number) => (largest < 0 ? [] : [[largest]]);
  const file = migrate({ ...head, nodes: shown(t.maxNode), edges: shown(t.maxEdge) });
  const header = validateHeader(file);
  const lanes = header.laneConfigurations as ProjectFile['laneConfigurations'];
  for (const [lane, l] of Object.entries(lanes)) checkLane(lane, l);
  checkCounterValues(file, t.maxNode + 1, t.maxEdge + 1);
  checkWhole({ ...file, laneConfigurations: lanes }, t);
  const { nodes: _nodes, edges: _edges, ...bare } = file as Record<string, unknown>;
  void _nodes;
  void _edges;
  await storage.create(id, bare as unknown as Header);
  return bare as unknown as Header;
}

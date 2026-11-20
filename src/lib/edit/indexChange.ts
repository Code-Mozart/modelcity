import { chunkId } from '../map/chunks';
import { cellOfNode, INDEX_VERSION, recordOf } from '../map/segmentIndex';
import type { EdgeRow, IndexChange, NodeRow } from '../project/storage';
import type { RowChange } from './change';

/** The nodes of a change as they were (`false`) or as they are (`true`): the changed ones, and the context. */
function nodesOf(c: RowChange, now: boolean) {
  const out = new Map(c.context.map((n) => [n[0], n]));
  for (const p of c.nodes) {
    const row = now ? p.after : p.before;
    if (row) out.set(row[0], row);
  }
  return out;
}

function recordFor(edge: EdgeRow, nodes: Map<number, NodeRow>) {
  const [p, q] = [nodes.get(edge[1]), nodes.get(edge[2])];
  if (!p || !q) throw new Error(`the nodes of segment ${edge[0]} are not in the change`);
  return recordOf(edge, p, q);
}

/** What a change does to the segment index (^1260): records for the segments that are new or different, cells for the nodes, and the ids of what is gone. */
export function indexChangeOf(c: RowChange, version = INDEX_VERSION): IndexChange {
  const now = nodesOf(c, true);
  return {
    version,
    records: c.edges.flatMap((p) => (p.after ? [recordFor(p.after, now)] : [])),
    cells: c.nodes.flatMap((p) => (p.after ? [cellOfNode(p.after)] : [])),
    removedSegments: c.edges.flatMap((p) => (p.after || !p.before ? [] : [p.before[0]])),
    removedNodes: c.nodes.flatMap((p) => (p.after || !p.before ? [] : [p.before[0]])),
  };
}

/** The chunks that a change touches (^1260): where its nodes were and are, and the chunks of its segments before and after. These are the chunks to read again. */
export function affectedChunks(c: RowChange): string[] {
  const ids = new Set<string>();
  const [was, now] = [nodesOf(c, false), nodesOf(c, true)];
  for (const p of c.nodes)
    for (const row of [p.before, p.after]) if (row) ids.add(chunkId(...cellOfNode(row).cell));
  const add = (edge: EdgeRow | null, nodes: Map<number, NodeRow>) => {
    if (!edge) return;
    const cells = recordFor(edge, nodes).cells;
    if (cells === 'wide') ids.add('wide');
    else cells.forEach(([cx, cy]) => ids.add(chunkId(cx, cy)));
  };
  for (const p of c.edges) {
    add(p.before, was);
    add(p.after, now);
  }
  return [...ids];
}

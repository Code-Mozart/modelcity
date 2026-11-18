import { chunkId, chunkOf } from '../map/chunks';
import type { Chunk } from '../map/chunkLoader';
import type { LoadedMap } from '../map/hit';
import type { EdgeRow, NodeRow } from '../project/storage';

export const mm = (m: number) => Math.round(m * 1000);
export const node = (id: number, x: number, y: number): NodeRow => [id, mm(x), mm(y), 0];
export const edge = (id: number, a: number, b: number): EdgeRow => [id, a, b, null, 1];

/** A map in memory made of rows: a chunk for each place that has a node, a segment in the chunks of both its nodes; `loading` ids are loading. */
export function loaded(nodes: NodeRow[], edges: EdgeRow[], loading: string[] = []): LoadedMap {
  const all = new Map(nodes.map((n) => [n[0], n]));
  const chunks = new Map<
    string,
    LoadedMap['chunks'] extends ReadonlyMap<string, infer S> ? S : never
  >();
  const chunk = (id: string): Chunk => {
    const s = chunks.get(id);
    if (s?.status === 'ready') return s.chunk;
    const fresh: Chunk = { id, nodes: [], edges: [], ends: [] };
    chunks.set(id, { status: 'ready', chunk: fresh });
    return fresh;
  };
  // Empty chunks are loaded too, as they are in memory.
  for (let cy = -2; cy <= 2; cy++) for (let cx = -2; cx <= 2; cx++) chunk(chunkId(cx, cy));
  const idOf = (n: NodeRow) => chunkId(...chunkOf(n[1] / 1000, n[2] / 1000));
  nodes.forEach((n) => chunk(idOf(n)).nodes.push(n));
  for (const e of edges)
    for (const id of new Set([idOf(all.get(e[1])!), idOf(all.get(e[2])!)])) chunk(id).edges.push(e);
  loading.forEach((id) => chunks.set(id, { status: 'loading' }));
  const placed = [...new Set(edges)];
  return {
    chunks,
    nodeOf: (id) => all.get(id),
    edgesAt: (n) => placed.filter((e) => e[1] === n || e[2] === n),
  };
}

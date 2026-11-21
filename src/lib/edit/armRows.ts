import type { EdgeRow } from '../project/storage';
import type { RowSource } from './deleteNodes';

/**
 * The arm of a node (^130, ^234): all nodes connected to it by segments, itself included, and all
 * their segments, followed in the storage (the whole of what is connected, however far it goes).
 */
export async function armRows(source: RowSource, id: number) {
  const nodes = new Set([id]);
  const edges = new Map<number, EdgeRow>();
  for (let frontier = [id]; frontier.length;) {
    const found = await source.edgesAt(frontier);
    found.forEach((e) => edges.set(e[0], e));
    frontier = [...new Set(found.flatMap((e) => [e[1], e[2]]))].filter((n) => !nodes.has(n));
    frontier.forEach((n) => nodes.add(n));
  }
  return { nodes: await source.nodes([...nodes]), edges: [...edges.values()] };
}

import type { EdgeRow, NodeRow } from '../project/storage';
import { changed, type Pair, type RowChange } from './change';

/** Where an operation reads the map from: the storage, which is the map (^1236); every call is a read of what is stored now. */
export interface RowSource {
  nodes(ids: number[]): Promise<NodeRow[]>;
  /** The segments that start or end at one of these nodes. */
  edgesAt(ids: number[]): Promise<EdgeRow[]>;
}

/** A small piece of the map held in memory while an operation works on it: the rows round the nodes it touches, with the segments of each node found at once. */
class Piece {
  readonly nodes = new Map<number, NodeRow>();
  readonly edges = new Map<number, EdgeRow>();
  private by = new Map<number, Set<number>>();

  static of(nodes: NodeRow[], edges: EdgeRow[]): Piece {
    const p = new Piece();
    nodes.forEach((n) => p.nodes.set(n[0], n));
    edges.forEach((e) => p.setEdge(e));
    return p;
  }

  copy(): Piece {
    return Piece.of([...this.nodes.values()], [...this.edges.values()]);
  }

  setEdge(e: EdgeRow) {
    this.deleteEdge(e[0]);
    this.edges.set(e[0], e);
    for (const n of [e[1], e[2]]) (this.by.get(n) ?? this.by.set(n, new Set()).get(n)!).add(e[0]);
  }

  deleteEdge(id: number) {
    const e = this.edges.get(id);
    if (!e) return;
    this.edges.delete(id);
    for (const n of [e[1], e[2]]) this.by.get(n)?.delete(id);
  }

  at(node: number): EdgeRow[] {
    return [...(this.by.get(node) ?? [])].map((id) => this.edges.get(id)!);
  }

  used(node: number) {
    return (this.by.get(node)?.size ?? 0) > 0;
  }
}

/** The rows round some nodes: the nodes, their segments, and the neighbours with all their segments (what decides whether they are left alone). */
async function piece(source: RowSource, ids: number[]): Promise<Piece> {
  const first = await source.edgesAt(ids);
  const known = new Set(ids);
  const near = [...new Set(first.flatMap((e) => [e[1], e[2]]))].filter((n) => !known.has(n));
  // The segments of the nodes that are asked for are known: only those at the neighbours are read.
  const [nodes, more] = await Promise.all([
    source.nodes([...known, ...near]),
    near.length ? source.edgesAt(near) : Promise.resolve([]),
  ]);
  return Piece.of(nodes, [...first, ...more]);
}

/**
 * Take a node away (what `main` does, ^322, ^434, ^749): its segments go with it, except that a
 * node with exactly one segment in and one out is dissolved: the segment in stays and runs on to
 * where the one out went (its radius automatic again), and the segment out goes. Not when that
 * would make a segment from a node to itself.
 */
function removeNode(p: Piece, id: number) {
  const here = p.at(id);
  const [into, out] = [here.filter((e) => e[2] === id), here.filter((e) => e[1] === id)];
  const [a, b] = [into[0], out[0]];
  const join =
    into.length === 1 && out.length === 1 && a![1] !== id && b![2] !== id && a![1] !== b![2];
  here.forEach((e) => p.deleteEdge(e[0]));
  p.nodes.delete(id);
  if (join) p.setEdge([a![0], a![1], b![2], null, a![4]]);
}

/** Nodes that no segment is left at are taken away, except `keep` (the node of the road that is being drawn). */
function dropUnused(p: Piece, keep: number | null) {
  for (const id of [...p.nodes.keys()]) if (!p.used(id) && id !== keep) p.nodes.delete(id);
}

/** What changed from `was` to `now`, each row as it was and as it is, with the nodes that the changed segments run between. */
function difference(was: Piece, now: Piece): RowChange {
  const pairs = <R extends [number, ...unknown[]]>(
    a: Map<number, R>,
    b: Map<number, R>,
  ): Pair<R>[] =>
    changed(
      [...new Set([...a.keys(), ...b.keys()])].map((id) => ({
        before: a.get(id) ?? null,
        after: b.get(id) ?? null,
      })),
    );
  const [nodes, edges] = [pairs(was.nodes, now.nodes), pairs(was.edges, now.edges)];
  const moved = new Set(nodes.map((n) => (n.before ?? n.after)![0]));
  const ends = new Set(
    edges.flatMap((e) => [e.before, e.after].flatMap((r) => (r ? [r[1], r[2]] : []))),
  );
  const context = [...ends].flatMap((id) => {
    const row = was.nodes.get(id) ?? now.nodes.get(id);
    return row && !moved.has(id) ? [row] : [];
  });
  return { nodes, edges, context };
}

/** Delete nodes, one after the other as `main` does (^434): the change it makes to the map. */
export async function deleteNodes(
  source: RowSource,
  ids: number[],
  keep: number | null = null,
): Promise<RowChange> {
  const was = await piece(source, ids);
  const now = was.copy();
  for (const id of ids) if (now.nodes.has(id)) removeNode(now, id);
  dropUnused(now, keep);
  return difference(was, now);
}

/** Delete segments (^920, ^160): they go, and the nodes that no segment is left at go with them. */
export async function deleteEdges(
  source: RowSource,
  edges: EdgeRow[],
  keep: number | null = null,
): Promise<RowChange> {
  const was = await piece(
    source,
    edges.flatMap((e) => [e[1], e[2]]),
  );
  const now = was.copy();
  for (const e of edges) now.deleteEdge(e[0]);
  dropUnused(now, keep);
  return difference(was, now);
}

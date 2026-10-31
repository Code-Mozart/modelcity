import type { Path } from './path';
import { withNode } from './path';
import type { NodeRef, Roads } from './roads';

/**
 * Splits and merges (^23): roads that meet share a node. There is no separate link: nodes of
 * different roads that lie at the same position *are* the same node, so undo, insert and remove
 * need no bookkeeping. Moving one moves all of them (the selection is always closed over them).
 */
const SAME_M = 1e-6;

const same = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) < SAME_M && Math.abs(a.y - b.y) < SAME_M;

/** All nodes, of any road, that are the node `ref` (it included, first). */
export function coincident(roads: Roads, ref: NodeRef): NodeRef[] {
  const at = roads[ref.road]?.nodes[ref.node];
  if (!at) return [];
  const others = roads.flatMap((path, road) =>
    path.nodes.flatMap((n, node) =>
      same(n, at) && !(road === ref.road && node === ref.node) ? [{ road, node }] : [],
    ),
  );
  return [ref, ...others];
}

/** The nodes with all the nodes they are shared with, each once. */
export function closeOver(roads: Roads, refs: NodeRef[]): NodeRef[] {
  const out: NodeRef[] = [];
  for (const ref of refs.flatMap((r) => coincident(roads, r))) {
    if (!out.some((o) => o.road === ref.road && o.node === ref.node)) out.push(ref);
  }
  return out;
}

/** Edges of a road next to the node: the one before and the one after. */
/**
 * After a drag changed headings in `road`, the shared nodes in other roads take the new heading
 * (a shared node has one heading).
 */
export function syncHeadings(roads: Roads, road: number, before: Path): Roads {
  const now = roads[road];
  if (!now) return roads;
  let out = roads;
  now.nodes.forEach((n, i) => {
    if (before.nodes[i] && before.nodes[i]!.th === n.th) return;
    for (const c of coincident(out, { road, node: i }).slice(1)) {
      const path = withNode(out[c.road]!, c.node, { th: n.th });
      out = out.map((p, r) => (r === c.road ? path : p));
    }
  });
  return out;
}

/** What kind of junction a node is, by the edges that run into and out of the nodes it is. */
export interface Junction {
  at: NodeRef;
  incoming: number;
  outgoing: number;
}

/** The nodes where roads split or merge: more than one edge in or out (^23). */
export function junctions(roads: Roads): Junction[] {
  const seen = new Set<string>();
  const out: Junction[] = [];
  roads.forEach((path, road) =>
    path.nodes.forEach((_, node) => {
      const group = coincident(roads, { road, node });
      const key = group
        .map((g) => `${g.road}:${g.node}`)
        .sort()
        .join(',');
      if (seen.has(key)) return;
      seen.add(key);
      const incoming = group.filter((g) => g.node > 0).length;
      const outgoing = group.filter((g) => g.node < (roads[g.road]?.nodes.length ?? 0) - 1).length;
      if (group.length > 1 && (incoming > 1 || outgoing > 1))
        out.push({ at: group[0]!, incoming, outgoing });
    }),
  );
  return out;
}

/**
 * What a click on a node does in draw mode (^23, ^65). On the end being drawn from it finishes the
 * road. While a road is being drawn, on a node of another road it merges into it, and on the other
 * end of the same road it extends from there. With no road being drawn, on a lone end node it
 * extends that road, else it splits a new road off the node.
 */
export type NodeAction = 'finish' | 'extend' | 'split' | 'merge' | null;

/** What a click on a curve does in draw mode: split a new road off, merge into it, or only insert a node. */
export type CurveAction = 'split' | 'merge' | 'insert' | null;

/** The state of drawing that decides the actions. */
export interface DrawState {
  roads: Roads;
  active: number | null;
  end: 'start' | 'end';
}

/** The node of the road being drawn that new nodes attach to. */
export function activeEnd({ roads, active, end }: DrawState): NodeRef | null {
  const nodes = active === null ? undefined : roads[active]?.nodes;
  if (!nodes?.length) return null;
  return { road: active!, node: end === 'end' ? nodes.length - 1 : 0 };
}

const isEnd = (roads: Roads, ref: NodeRef) =>
  ref.node === 0 || ref.node === (roads[ref.road]?.nodes.length ?? 0) - 1;

export function nodeAction(d: DrawState, ref: NodeRef): NodeAction {
  const end = activeEnd(d);
  if (end && coincident(d.roads, end).some((c) => c.road === ref.road && c.node === ref.node)) {
    return 'finish';
  }
  const leaf = isEnd(d.roads, ref);
  if (d.active === null) return leaf && coincident(d.roads, ref).length === 1 ? 'extend' : 'split';
  if (ref.road !== d.active) return 'merge';
  return leaf ? 'extend' : null;
}

export function curveAction(d: DrawState, road: number): CurveAction {
  if (d.active === null) return 'split';
  return road === d.active ? 'insert' : 'merge';
}

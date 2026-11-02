import { LANE_WIDTH_M } from '../curves/lane';
import { nodeOf, type Graph } from '../model/graph';
import { snapTo } from '../snap/engine';
import { suggestionsOf, type RuleEdge } from '../snap/rules';
import type { SnapHit, Suggestion } from '../snap/types';
import { chainsOf } from './chains';
import { placementAt } from './ops';
import { previewOf, type Drawn } from './targets';
import type { Hover, PointerInfo, Press } from './types';

/** The nodes that move with a press: the dragged one and its group (^264). */
export function movedIds(press: Press | null): number[] {
  return press?.kind === 'drag' && press.drag.handle.type === 'node'
    ? [press.id, ...press.group.map((g) => g.id)]
    : [];
}

/** The graph without some nodes and the edges at them: what the others offer while those move. */
export function without(g: Graph, ids: number[]): Graph {
  if (!ids.length) return g;
  const gone = new Set(ids);
  const edges = g.edges.filter((e) => !gone.has(e.start) && !gone.has(e.end));
  return { ...g, nodes: g.nodes.filter((n) => !gone.has(n.id)), edges };
}

/** All snap suggestions of a graph (^275): its nodes and its segments, derived from the chains. */
export function suggestionsOfGraph(g: Graph): Suggestion[] {
  const chains = chainsOf(g);
  const width = new Map(chains.flatMap((c) => c.nodeIds.map((id) => [id, c.width] as const)));
  const edges = chains.flatMap((c) =>
    c.edges.map((ref, i): RuleEdge => ({
      id: c.edgeIds[i]!,
      start: c.nodeIds[i]!,
      end: c.nodeIds[i + 1]!,
      ref,
      width: c.width,
    })),
  );
  return suggestionsOf(g.nodes, edges, (id) => width.get(id) ?? LANE_WIDTH_M);
}

/**
 * What a placed or moved node can snap to (^101): the suggestions of everything but the nodes that
 * move, and the places they were at (^113).
 */
export function snapBase(graph: Graph, press: Press | null): Suggestion[] {
  const moving = movedIds(press);
  if (!moving.length || !press || press.kind !== 'drag') return suggestionsOfGraph(graph);
  const before = press.undo.graph;
  const previous: Suggestion[] = moving.flatMap((id) => {
    const n = nodeOf(before, id);
    return n
      ? [
          {
            kind: 'point' as const,
            at: { x: n.x, y: n.y },
            heading: n.th,
            rule: 'previous' as const,
            from: [],
          },
        ]
      : [];
  });
  return [...suggestionsOfGraph(without(before, moving)), ...previous];
}

export interface SnapArgs {
  info: PointerInfo | null;
  press: Press | null;
  hover: Hover | null;
  drawing: boolean;
  pinned: readonly number[];
}

/** Whether the pointer places or moves a node now: over empty canvas in draw mode, or dragging a node. */
function snaps({ press, hover, drawing }: SnapArgs): 'place' | 'move' | null {
  if (press) return movedIds(press).length ? 'move' : null;
  return drawing && hover?.kind === 'preview' ? 'place' : null;
}

/** What the pointer is pulled to, if it places or moves a node and `Ctrl` is not held (^101, ^112). */
export function snapFor(base: Suggestion[], a: SnapArgs): SnapHit | null {
  const { info } = a;
  const what = snaps(a);
  if (!info || info.ctrl || !what) return null;
  // A node is placed beside others, not on them: clicking a node merges the road into it instead (^23).
  const list =
    what === 'place' ? base.filter((s) => !(s.kind === 'point' && s.node !== undefined)) : base;
  return snapTo(list, { pt: info.pt, scale: info.scale, pinned: a.pinned });
}

/** The preview of a node a click would place is where it snaps to (^101). */
export function snapPreview(
  hover: Hover | null,
  snap: SnapHit | null,
  drawn: () => Drawn,
): Hover | null {
  return hover?.kind === 'preview' && snap ? previewOf(drawn(), placementAt(snap.pt)) : hover;
}

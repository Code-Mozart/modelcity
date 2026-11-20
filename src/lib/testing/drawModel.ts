import { changeOfGraphs, graphOfRows, type NextIds } from '../edit/graphPiece';
import {
  cancelled,
  curveAction,
  insertAt,
  mergeInto,
  nodeAction,
  NOT_DRAWING,
  placeNode,
  splitFrom,
  type DrawState,
} from '../editor/drawing';
import type { Sample } from '../curves/piece';
import type { Vec } from '../curves/vec';
import { edgesAt, edgesOut, type Graph } from '../model/graph';
import type { EdgeRow, NodeRow } from '../project/storage';
import type { Rows } from './mainRemoval';
import { sortedRows } from './editModel';

/** The state the model of drawing keeps (^1263): the rows, the road being drawn, the next ids, and the curve a split may give back (^237). */
export interface DrawModel {
  rows: Rows;
  draw: DrawState;
  next: NextIds;
  split: { node: number; before: Rows } | null;
}

/** What is under a click, as the editor picked it. */
export type Under =
  | { kind: 'node'; id: number }
  | { kind: 'segment'; edge: number; at: Sample }
  | { kind: 'void'; pt: Vec };

const whole = (m: DrawModel): Graph => graphOfRows(m.rows.nodes, m.rows.edges, m.next);

/** The rows of a whole graph, with the next ids after it. */
function rowsOf(before: Graph, after: Graph, m: DrawModel): Pick<DrawModel, 'rows' | 'next'> {
  const c = changeOfGraphs(before, after);
  const nodes = new Map(m.rows.nodes.map((n) => [n[0], n]));
  const edges = new Map(m.rows.edges.map((e) => [e[0], e]));
  for (const p of c.nodes) {
    if (p.after) nodes.set(p.after[0], p.after);
    else nodes.delete(p.before![0]);
  }
  for (const p of c.edges) {
    if (p.after) edges.set(p.after[0], p.after);
    else edges.delete(p.before![0]);
  }
  return {
    rows: sortedRows({
      nodes: [...nodes.values()] as NodeRow[],
      edges: [...edges.values()] as EdgeRow[],
    }),
    next: { node: after.nextNodeId, edge: after.nextEdgeId },
  };
}

/**
 * What a click in draw mode does to the whole map, by the rules ported from `main` (the editor
 * works on pieces read from the storage; the model on everything at once): the model after it, or
 * null when it is no step. `origin` is not modelled (it only names the step, `close` or `merge`).
 */
export function clicked(m: DrawModel, on: Under, alt: boolean): DrawModel | null {
  const g = whole(m);
  if (on.kind === 'void') {
    const r = placeNode(g, m.draw, { pt: on.pt, th: null });
    return { ...m, ...rowsOf(g, r.graph, m), draw: r.draw, split: null };
  }
  if (on.kind === 'segment') {
    const r = insertAt(g, on.edge, on.at);
    if (curveAction(m.draw) === 'split')
      return {
        ...m,
        ...rowsOf(g, r.graph, m),
        draw: splitFrom(r.id),
        split: { node: r.id, before: m.rows },
      };
    return {
      ...m,
      ...rowsOf(g, mergeInto(r.graph, m.draw, r.id), m),
      draw: NOT_DRAWING,
      split: null,
    };
  }
  const act = nodeAction(m.draw, on.id, (id) => edgesAt(g, id).length);
  if (act === 'finish' || act === 'cancel') return finished(m);
  if (act === 'split') return { ...m, draw: splitFrom(on.id), split: null };
  if (act === 'extend') {
    const backwards = edgesOut(g, on.id).length > 0 !== alt;
    return {
      ...m,
      draw: { ...m.draw, active: on.id, end: backwards ? 'start' : 'end' },
      split: null,
    };
  }
  return { ...m, ...rowsOf(g, mergeInto(g, m.draw, on.id), m), draw: NOT_DRAWING, split: null };
}

/** The road is finished: a split finished at once gives the curve back (^237), a first node alone goes (^437). */
export function finished(m: DrawModel): DrawModel | null {
  if (m.draw.active === null) return null;
  if (m.split?.node === m.draw.active)
    return { ...m, rows: m.split.before, draw: NOT_DRAWING, split: null };
  const g = whole(m);
  return { ...m, ...rowsOf(g, cancelled(g, m.draw), m), draw: NOT_DRAWING, split: null };
}

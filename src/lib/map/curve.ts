import { buildEdge } from '../curves/edge';
import { boxAround, type Box } from '../curves/hull';
import type { Piece } from '../curves/types';
import type { EdgeRow, NodeRow } from '../project/storage';

/** A segment as it is drawn: its curve and the box round it (the box that the segment index holds, ^1239). */
export interface SkeletonEdge {
  id: number;
  pieces: Piece[];
  box: Box;
}

const toM = (mm: number) => mm / 1000;
const node = ([, x, y, th]: NodeRow) => ({ x: toM(x), y: toM(y), th });

const curves = new WeakMap<EdgeRow, { p: NodeRow; q: NodeRow; edge: SkeletonEdge }>();

/**
 * The curve of a segment, made from its two nodes and its radius alone (^172) and kept while the
 * rows stay the same objects (the rows are shared between the chunks, `ChunkIndex`).
 */
export function curveOf(row: EdgeRow, p: NodeRow, q: NodeRow): SkeletonEdge {
  const kept = curves.get(row);
  if (kept && kept.p === p && kept.q === q) return kept.edge;
  const pieces = buildEdge(node(p), node(q), row[3] === null ? null : toM(row[3])).pieces;
  const edge = { id: row[0], pieces, box: boxAround(pieces) };
  curves.set(row, { p, q, edge });
  return edge;
}

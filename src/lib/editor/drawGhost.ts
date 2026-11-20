import { buildEdge } from '../curves/edge';
import type { Piece } from '../curves/types';
import type { PathNode } from '../curves/types';
import type { Vec } from '../curves/vec';
import type { NodeRow } from '../project/storage';
import { autoHeadingFor, nodeAtSample, ordered, type DrawState } from './drawing';
import type { Sample } from '../curves/piece';

/** The preview in draw mode (^40, ^123, ^125): the curve the next click would add (dashed), and the node it would place. */
export interface Ghost {
  pieces: Piece[] | null;
  node: PathNode | null;
}

/** What is under the pointer, as far as the preview needs it: a node a click merges into, a point of a curve a click merges at, or the void. */
export type GhostTarget =
  | { kind: 'node'; node: NodeRow; merges: boolean }
  | { kind: 'curve'; at: Sample }
  | { kind: 'void'; pt: Vec };

const pathNode = ([, x, y, th]: NodeRow): PathNode => ({ x: x / 1000, y: y / 1000, th });

/**
 * The preview (`main`'s `previewOf` and `mergePreview`): on the void the node a click would place,
 * with the automatic heading and the curve to it from the node being drawn from; on a node or curve
 * that a click merges into, the curve to it.
 */
export function ghostOf(d: DrawState, tip: NodeRow | undefined, on: GhostTarget): Ghost | null {
  const from = tip ? pathNode(tip) : null;
  const curve = (to: PathNode) => {
    if (!from) return null;
    const [p, q] = ordered(from, to, d.end);
    return buildEdge(p, q, null).pieces;
  };
  if (on.kind === 'void') {
    const th = from ? autoHeadingFor(d.end)(from, on.pt) : 0;
    const node = { x: on.pt.x, y: on.pt.y, th };
    return { pieces: curve(node), node };
  }
  if (!from) return null;
  if (on.kind === 'node')
    return on.merges ? { pieces: curve(pathNode(on.node)), node: null } : null;
  return { pieces: curve(nodeAtSample(on.at)), node: null };
}

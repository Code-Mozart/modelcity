import { curveOf } from '../map/curve';
import type { EdgeRow, NodeRow } from '../project/storage';
import { edgeHandles, headPoint, pathNode, type RowHandle } from '../editor/handles';
import type { Grip } from '../editor/moving';
import type { ScaffoldView } from './scaffold';

const sameGrip = (h: RowHandle, g: Grip | null) =>
  !!g &&
  h.type === g.type &&
  (h.type === 'head'
    ? h.node === (g as { node: number }).node
    : h.edge === (g as { edge: number }).edge &&
      (h.type !== 'rad' || (h.k === (g as { k: number }).k && h.t === (g as { t: number }).t)));

/**
 * The scaffold of the segments that show it (`shownSegments`), from their rows: their curves, the
 * heading arrows and points of their nodes and of the `lone` nodes (no segment), and their bend and
 * radius points; `focus` is the control point hovered or dragged.
 */
export function scaffoldOf(
  edges: readonly EdgeRow[],
  lone: readonly NodeRow[],
  nodeOf: (id: number) => NodeRow | undefined,
  { scale, focus }: { scale: number; focus: Grip | null },
): ScaffoldView {
  const nodes = new Map(lone.map((n) => [n[0], n]));
  const refs: ScaffoldView['refs'] = [];
  const handles: RowHandle[] = [];
  for (const e of edges) {
    const [p, q] = [nodeOf(e[1]), nodeOf(e[2])];
    if (!p || !q) continue;
    [p, q].forEach((n) => nodes.set(n[0], n));
    const rad = focus?.type === 'rad' && focus.edge === e[0] ? { k: focus.k, t: focus.t } : null;
    refs.push({ i: 0, p: pathNode(p), q: pathNode(q), E: curveOf(e, p, q).E, rad });
    handles.push(...edgeHandles(e, p, q, scale));
  }
  for (const n of nodes.values())
    handles.push({ type: 'head', node: n[0], ...headPoint(n, scale) });
  return {
    refs,
    arrows: [...nodes.values()].map(pathNode),
    points: handles.map((h) => ({ x: h.x, y: h.y, type: h.type, focused: sameGrip(h, focus) })),
  };
}

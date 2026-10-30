import type { NodeRef, Roads } from './curves/roads';
import type { Vec } from './curves/vec';

/** The selection box in screen pixels, axis-aligned with the viewport (^70). */
export interface Band {
  a: Vec;
  b: Vec;
}

export const sameNode = (p: NodeRef, q: NodeRef) => p.road === q.road && p.node === q.node;

export const isSelected = (sel: NodeRef[], ref: NodeRef) => sel.some((s) => sameNode(s, ref));

/** The selection with the nodes added; nodes already selected keep their place. */
export const withNodes = (sel: NodeRef[], refs: NodeRef[]) =>
  refs.reduce((all, r) => (isSelected(all, r) ? all : [...all, r]), sel);

export const withoutNode = (sel: NodeRef[], ref: NodeRef) => sel.filter((s) => !sameNode(s, ref));

/** The two nodes a curve (segment) runs between. */
export const curveNodes = (road: number, edge: number): NodeRef[] => [
  { road, node: edge },
  { road, node: edge + 1 },
];

export const pickedCount = (sel: NodeRef[], refs: NodeRef[]) =>
  refs.filter((r) => isSelected(sel, r)).length;

/**
 * A click on a curve (^74): selects its two nodes; with shift it adds them, or, if both are
 * selected already, deselects them.
 */
export function afterCurveClick(sel: NodeRef[], nodes: NodeRef[], shift: boolean): NodeRef[] {
  if (!shift) return nodes;
  if (pickedCount(sel, nodes) < nodes.length) return withNodes(sel, nodes);
  return nodes.reduce(withoutNode, sel);
}

/** The nodes of all roads whose screen position lies inside the box. */
export function nodesInBand(roads: Roads, band: Band, project: (p: Vec) => Vec): NodeRef[] {
  const [x0, x1] = [band.a.x, band.b.x].sort((p, q) => p - q);
  const [y0, y1] = [band.a.y, band.b.y].sort((p, q) => p - q);
  return roads.flatMap((path, road) =>
    path.nodes.flatMap((n, node) => {
      const s = project(n);
      return s.x >= x0! && s.x <= x1! && s.y >= y0! && s.y <= y1! ? [{ road, node }] : [];
    }),
  );
}

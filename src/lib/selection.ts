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

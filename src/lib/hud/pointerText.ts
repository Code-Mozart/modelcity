import type { Vec } from '../curves/vec';
import type { Hover } from '../editor/pick';

const m = (v: number) => `${v.toFixed(3)} m`;

/** The world coordinates of the pointer (^833): `x -12.346 m, y 8.000 m`, dashes when it is not over the map. */
export const coordinatesText = (pt: Vec | null) =>
  pt ? `x ${m(pt.x)}, y ${m(pt.y)}` : 'x - m, y - m';

/** What the pointer is on (^871): `node 4`, `segment 2 (start node 4, end node 5)` (also for its bend and radius points), the heading point of a node as the node, `-` for nothing. */
export function hoverText(on: Hover | null): string {
  if (!on) return '-';
  if (on.kind === 'node') return `node ${on.id}`;
  const h = on.kind === 'handle' ? on.handle : null;
  if (h?.type === 'head') return `node ${h.node}`;
  const [edge, [a, b]] = h
    ? [h.edge, h.nodes]
    : on.kind === 'segment'
      ? [on.edge, on.nodes]
      : [0, [0, 0]];
  return `segment ${edge} (start node ${a}, end node ${b})`;
}

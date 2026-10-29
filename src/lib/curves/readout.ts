import type { Edge } from './edge';
import type { EdgeRef, Path } from './path';
import { toDeg } from './vec';

const m = (v: number) => `${v.toFixed(1)} m`;

function radiusText(E: Exclude<Edge, { kind: 'line' }>): string {
  return `R ${m(E.R)}${E.auto ? ' (auto)' : ''}  max ${m(E.Rmax)}`;
}

function edgeText(E: Edge): string {
  switch (E.kind) {
    case 'C':
      return `one bend: line, arc, line  ${radiusText(E)}`;
    case 'S':
      return `S-curve: arc, straight, arc  ${radiusText(E)}  straight ${m(E.straight)}`;
    case 'H':
      return `hook (same direction, provisional)  ${radiusText(E)}  straight ${m(E.straight)}`;
    case 'line':
      return 'straight';
  }
}

/** Plain-text description of the selected node and every edge, for the readout panel. */
export function readoutLines(path: Path, edges: EdgeRef[], sel: number): string[] {
  const lines: string[] = [];
  const n = path.nodes[sel];
  if (n) {
    lines.push(`node ${sel + 1}  heading ${toDeg(n.th).toFixed(1)}°  at ${m(n.x)}, ${m(n.y)}`);
  }
  for (const { i, E } of edges) lines.push(`${i + 1}–${i + 2}  ${edgeText(E)}`);
  if (!path.nodes.length) lines.push('no nodes: use Append to add the first one');
  return lines;
}

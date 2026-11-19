import type { LoadedMap } from '../map/hit';
import { networkOf } from '../map/network';
import type { EdgeRow } from '../project/storage';
import { branchOf } from './branchOf';
import type { Hover } from './pick';
import type { Selection } from './selection';

/** What a delete does (^434, ^757, ^920, ^160): nodes, or segments, and the name of the step. */
export type Doing = ({ kind: 'nodes'; ids: number[] } | { kind: 'segments'; edges: EdgeRow[] }) & {
  name: string;
  /** What the user is told when it is done: the branch went on beyond what is loaded, so only the loaded part was deleted. */
  told?: string;
};

const nodes = (ids: number[]): Doing => ({
  kind: 'nodes',
  ids,
  name: ids.length === 1 ? 'delete node' : `delete ${ids.length} nodes`,
});

/** The row of the segment that is hovered, from what is loaded. */
function edgeRow(map: LoadedMap, on: Extract<Hover, { kind: 'segment' }>): EdgeRow | undefined {
  return map.edgesAt(on.nodes[0]).find((e) => e[0] === on.edge);
}

export const PARTLY_TEXT =
  'The branch goes on beyond the loaded map: only the loaded part was deleted.';

/** The segments of the hovered one, or with Alt of its whole branch (as far as it is loaded). */
function segments(
  map: LoadedMap,
  on: Extract<Hover, { kind: 'segment' }>,
  alt: boolean,
): Doing | null {
  const own = edgeRow(map, on);
  if (!own) return null;
  if (!alt) return { kind: 'segments', edges: [own], name: 'delete segment' };
  const branch = branchOf(networkOf(map), on);
  const rows = new Map(
    branch.nodes.flatMap((n) => map.edgesAt(n)).map((e): [number, EdgeRow] => [e[0], e]),
  );
  const edges = branch.edges.map((id) => rows.get(id)).filter((e): e is EdgeRow => e !== undefined);
  const told = branch.complete ? undefined : PARTLY_TEXT;
  return { kind: 'segments', edges: edges.length ? edges : [own], name: 'delete branch', told };
}

/** Whether the pointer is on the selection, which has several nodes: on one of them or on a segment between them (^290, ^699, ^779). */
export function onSelection(sel: Selection, on: Hover | null): boolean {
  if (sel.size < 2 || !on) return false;
  return on.kind === 'node' ? sel.has(on.id) : on.nodes.every((id) => sel.has(id));
}

/** `Del` or `Backspace` (^687, ^757, ^920): the selection, else what is hovered. */
export function byKey(
  sel: Selection,
  on: Hover | null,
  alt: boolean,
  map: LoadedMap,
): Doing | null {
  if (sel.size) return nodes([...sel]);
  if (on?.kind === 'node') return nodes([on.id]);
  return on ? segments(map, on, alt) : null;
}

/** A click of the right button on something (^489, ^699, ^920): the selection if the pointer is on it, else what is under the pointer. */
export function byClick(
  sel: Selection,
  on: Hover | null,
  alt: boolean,
  map: LoadedMap,
): Doing | null {
  if (onSelection(sel, on)) return nodes([...sel]);
  if (on?.kind === 'node') return nodes([on.id]);
  return on ? segments(map, on, alt) : null;
}

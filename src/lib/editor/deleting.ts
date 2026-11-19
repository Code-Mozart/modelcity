import type { LoadedMap } from '../map/hit';
import type { EdgeRow } from '../project/storage';
import type { Hover } from './pick';
import type { Selection } from './selection';

/** What a delete does (^434, ^757, ^920, ^160): nodes, or segments, or the branch of a segment, and the name of the step. */
export type Doing = (
  | { kind: 'nodes'; ids: number[] }
  | { kind: 'segments'; edges: EdgeRow[] }
  /** The branch that a segment is on, followed in the storage as far as it goes. */
  | { kind: 'branch'; edge: EdgeRow }
) & { name: string };

const nodes = (ids: number[]): Doing => ({
  kind: 'nodes',
  ids,
  name: ids.length === 1 ? 'delete node' : `delete ${ids.length} nodes`,
});

/** The row of the segment that is hovered, from what is loaded. */
function edgeRow(map: LoadedMap, on: Extract<Hover, { kind: 'segment' }>): EdgeRow | undefined {
  return map.edgesAt(on.nodes[0]).find((e) => e[0] === on.edge);
}

/** The hovered segment, or with Alt the branch it is on. */
function segments(
  map: LoadedMap,
  on: Extract<Hover, { kind: 'segment' }>,
  alt: boolean,
): Doing | null {
  const own = edgeRow(map, on);
  if (!own) return null;
  return alt
    ? { kind: 'branch', edge: own, name: 'delete branch' }
    : { kind: 'segments', edges: [own], name: 'delete segment' };
}

/** Whether the pointer is on the selection, which has several nodes: on one of them or on a segment between them (^290, ^699, ^779). */
export function onSelection(sel: Selection, on: Hover | null): boolean {
  if (sel.size < 2 || !on) return false;
  return on.kind === 'node' ? sel.has(on.id) : on.nodes.every((id) => sel.has(id));
}

/** `Del` or `Backspace` (^687, ^757, ^920): the selection, else what is hovered, as a right click does but never a branch (`Alt` is not for `Del`, as on `main`). */
export function byKey(sel: Selection, on: Hover | null, map: LoadedMap): Doing | null {
  if (sel.size) return nodes([...sel]);
  if (on?.kind === 'node') return nodes([on.id]);
  return on ? segments(map, on, false) : null;
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

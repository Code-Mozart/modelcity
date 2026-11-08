import { FEATURES } from '../features';
import type { Vec } from '../curves/vec';
import type { Hover } from '../editor/types';
import type { Graph } from '../model/graph';

/** The debug aids (^833, ^368): hidden, off by default, switched on with a key that has no hint. */
export class DebugTools {
  /** The mouse coordinates under the version (^833). */
  coordinates = $state<boolean>(FEATURES.debugCoordinates);

  toggleCoordinates() {
    this.coordinates = !this.coordinates;
  }
}

/** `Ctrl+Period` switches the mouse coordinates on and off (^833). */
export const isCoordinatesKey = (
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
) => (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '.';

/** The world position of the pointer in meters, as the coordinates show it. */
export const coordinatesText = (pt: Vec | null | undefined): string =>
  pt ? `x ${pt.x.toFixed(3)} m, y ${pt.y.toFixed(3)} m` : 'x -, y -';

/**
 * What the pointer is on, with the ids to report a bug with (^871): a node by its id, a segment
 * by its id and the ids of its start and end node. Nothing when it is on nothing.
 */
export function hoverText(graph: Graph, hover: Hover | null): string {
  const segment = (id: number) => {
    const e = graph.edges.find((x) => x.id === id);
    return e ? `segment ${e.id} (start node ${e.start}, end node ${e.end})` : `segment ${id}`;
  };
  if (hover?.kind === 'handle') {
    const { type, id } = hover.handle;
    return type === 'node' || type === 'head' ? `node ${id}` : segment(id);
  }
  if (hover?.kind === 'candidate') {
    const derived = hover.derived ? 'derived node on ' : '';
    return derived + segment(hover.hit.edge);
  }
  return '-';
}

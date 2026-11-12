import { FEATURES } from '../features';
import type { Vec } from '../curves/vec';
import type { Hover } from '../editor/types';
import type { Graph } from '../model/graph';
import { nearMisses } from '../editor/nearMisses';
import { signName, signsOf } from '../editor/signs';

/** The debug aids (^833, ^368): hidden, off by default, switched on with a key that has no hint. */
export class DebugTools {
  /** The mouse coordinates under the version (^833). */
  coordinates = $state<boolean>(FEATURES.debugCoordinates);

  toggleCoordinates() {
    this.coordinates = !this.coordinates;
    if (!this.coordinates) this.releaseWalk();
  }

  /** How far the dots have walked along the skin of their polygons, in meters (^948). */
  walk = $state(0);
  /** Which way the walk goes while `,` or `.` is held: -1 back, 1 forward, 0 not (^948). */
  walking = $state<-1 | 0 | 1>(0);
  private forward = false;
  private back = false;

  /** `,` or `.` goes down or up; only while the debug layer is shown. True when the key is the walk's (^948). */
  holdWalk(key: string, down: boolean): boolean {
    if (key !== ',' && key !== '.') return false;
    if (!this.coordinates) return false;
    if (key === '.') this.forward = down;
    else this.back = down;
    this.walking = (Number(this.forward) - Number(this.back)) as -1 | 0 | 1;
    return true;
  }

  releaseWalk() {
    this.forward = this.back = false;
    this.walking = 0;
  }

  /** Walks for `seconds` in the held direction. */
  step(seconds: number) {
    this.walk += this.walking * WALK_SPEED_M_S * seconds;
  }
}

/** How fast the dots walk while a key is held (meters per second). */
export const WALK_SPEED_M_S = 6;

/** `Ctrl+Period` switches the mouse coordinates on and off (^833). */
export const isCoordinatesKey = (
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
) => (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '.';

/** `,` (back) and `.` (forward) with no modifier walk the dots of the debug layer (^948). */
export const isWalkKey = (
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
) => !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && (e.key === ',' || e.key === '.');

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

/** The segment the pointer is on, if any. */
function hoveredSegment(graph: Graph, hover: Hover | null) {
  const node = hover?.kind === 'handle' && ['node', 'head'].includes(hover.handle.type);
  const id =
    hover?.kind === 'handle' && !node
      ? hover.handle.id
      : hover?.kind === 'candidate'
        ? hover.hit.edge
        : null;
  return graph.edges.find((e) => e.id === id) ?? null;
}

/** The sign of the segment the pointer is on, by its name (^1017); null on anything else. */
export function signText(graph: Graph, hover: Hover | null): string | null {
  const e = hoveredSegment(graph, hover);
  return e ? `sign: ${signName(signsOf(graph).get(e.id)!)}` : null;
}

/** The nodes that the hovered node almost touches (^884), one line each: what it is off by. */
export function nearMissLines(graph: Graph, hover: Hover | null): string[] {
  if (hover?.kind !== 'handle') return [];
  const { type, id } = hover.handle;
  return type === 'node' || type === 'head' ? nearMisses(graph, id) : [];
}

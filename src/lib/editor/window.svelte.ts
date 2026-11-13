import type { Box } from '../curves/hull';
import type { Graph } from '../model/graph';
import { derivedNodes } from './derived';
import { windowOf as partOf } from './windowed';
import { viewBox } from '../render/paint';
import type { Size, View } from '../camera/view';

/** Room round the view that is made too (meters, at least): what the road shows at the edge of the screen looks at what is round it. */
const MIN_ROOM_M = 150;

/**
 * The window of a view as a text: the world box of the screen with room round it (half a screen, and
 * not less than `MIN_ROOM_M`), grown to steps of half of that room, so that panning a little leaves it
 * as it is (^1216).
 */
export function windowOf(view: View, size: Size): string {
  const b = viewBox({ view, size });
  const room = Math.max(MIN_ROOM_M, 0.5 * Math.max(b.x1 - b.x0, b.y1 - b.y0));
  const step = room / 2;
  const down = (v: number) => Math.floor((v - room) / step) * step;
  const up = (v: number) => Math.ceil((v + room) / step) * step;
  return [down(b.x0), up(b.x1), down(b.y0), up(b.y1)].join(',');
}

export function boxOfKey(key: string): Box {
  const [x0, x1, y0, y1] = key.split(',').map(Number);
  return { x0: x0!, x1: x1!, y0: y0!, y1: y1! };
}

/** The window on the map that is shown (a world box, or null for all of it) and the part of the graph in it (^1216): what is made from the graph is made for this part only. */
export class GraphWindow {
  box = $state<Box | null>(null);
  shown = $derived.by(() => {
    const g = this.graph();
    return this.box ? partOf(g, this.box) : g;
  });

  /** The derived nodes of that part (^822, ^823), never stored. */
  derived = $derived(derivedNodes(this.shown));

  constructor(private graph: () => Graph) {}
}

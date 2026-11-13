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

/** What the window needs to know of the editor. */
interface Subject {
  graph: Graph;
  pins: { list: readonly number[] };
  selection: readonly number[];
  active: number | null;
  press: unknown;
}

/**
 * The window on the map that is shown (a world box as a text, from where the view is) and the part
 * of the graph in it (^1216): what is made from the graph is made for this part only. The window is
 * read where the part is made, not copied in an effect, so that it is never a frame behind the view.
 */
export class GraphWindow {
  /** Where the window comes from; none (all of the graph) until the view says. */
  source = $state<(() => string) | null>(null);
  /** The window as it was when it was last free: while a node is pressed it stays (the roads are numbered in it). */
  private held: string | undefined;
  private key = $derived.by(() => {
    const now = this.source?.();
    if (this.locked()) return this.held ?? now;
    return (this.held = now);
  });

  /** The part of a graph that is in the window (the graph itself when there is no window). */
  of = (g: Graph): Graph => (this.key ? partOf(g, boxOfKey(this.key), this.keep()) : g);
  shown = $derived.by(() => this.of(this.graph()));

  /** The derived nodes of that part (^822, ^823), never stored. */
  derived = $derived.by(() => derivedNodes(this.shown));

  constructor(private editor: Subject) {}

  private graph = () => this.editor.graph;
  /** The nodes the window must hold, wherever they are: pinned, selected, being extended. */
  private keep = () => [
    ...this.editor.pins.list,
    ...this.editor.selection,
    ...(this.editor.active === null ? [] : [this.editor.active]),
  ];
  private locked = () => this.editor.press !== null;
}

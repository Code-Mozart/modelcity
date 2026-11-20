import { screenToWorld, type Point } from '../camera/view';
import type { Vec } from '../curves/vec';
import { changeOfGraphs, graphOfRows, readPiece, type NextIds } from '../edit/graphPiece';
import { nodeAt, segmentAt, type LoadedMap } from '../map/hit';
import { edgeOfId, nodeOf, type Graph } from '../model/graph';
import type { Editor, Planned } from './editor.svelte';
import { dragged, droppedNode, gripNodes, type Drop, type Grip } from './moving';
import { reachOf, type Hover } from './pick';
import { DRAG_PX, type Surroundings } from './selectPress';
import type { Selection } from './selection';

/** What a drag does, by what it holds (`main`'s `HANDLE_NAME`). */
const NAME = { head: 'turn heading', ctrl: 'bend curve', rad: 'change radius' } as const;

interface Held {
  grip: Grip;
  at: Point;
  moved: boolean;
  /** The other nodes that move along with a dragged node (^71). */
  group: number[];
  /** The selection once the drag has begun (a node that is dragged is selected, ^72), null where it does not change. */
  selection: Selection | null;
  /** Where the pointer is, in the world. */
  pt: Vec;
  ctrl: boolean;
  /** The heading before the drag: the angle steps count from it (^315). */
  from: number;
  drop: Drop | null;
}

/**
 * The selection when a node is grabbed in select mode (`main`'s `pressNode` and `dragPress`): a
 * selected node moves with all the others; an unselected one is selected alone, with `Shift` added.
 * Its heading point selects its node too (^74); a bend or radius point leaves the selection.
 */
function selectionOnGrab(sel: Selection, grip: Grip, shift: boolean): Selection | null {
  if (grip.type !== 'node' && grip.type !== 'head') return null;
  if (sel.has(grip.node)) return null;
  return shift && grip.type === 'node' ? new Set([...sel, grip.node]) : new Set([grip.node]);
}

/**
 * The left button on a node or a control point, in select and draw mode (^1265, ported from
 * `main`'s `dragPress`, `dragStep` and `droppedNode`): once it has moved, the grip follows the pointer
 * (what it would do is drawn over the map, worked out on the loaded rows), and when it is let go
 * it is worked out again on the rows read from the storage in its turn and written as one step. A
 * node let go over another node or a curve merges into it (^248, ^268). Without moving it is a click,
 * which the press of the mode handles.
 */
export class MovePress {
  private held: Held | null = null;

  constructor(
    private editor: Editor,
    private around: Surroundings,
  ) {}

  get active() {
    return this.held !== null;
  }

  /** Is a grip being dragged (it moved far enough)? */
  get dragging() {
    return !!this.held?.moved;
  }

  grab(grip: Grip, at: Point, shift: boolean) {
    const { editor } = this;
    const selecting = editor.mode === 'select';
    const selection = selecting ? selectionOnGrab(editor.selection, grip, shift) : null;
    const sel = selection ?? editor.selection;
    const group =
      selecting && grip.type === 'node' ? [...sel].filter((id) => id !== grip.node) : [];
    const row = this.around
      .map()
      .nodeOf(grip.type === 'node' || grip.type === 'head' ? grip.node : -1);
    this.held = {
      grip,
      at,
      moved: false,
      group,
      selection,
      pt: this.world(at),
      ctrl: false,
      from: row?.[3] ?? 0,
      drop: null,
    };
  }

  private world(at: Point): Vec {
    const { view, size } = this.around.screen();
    return screenToWorld(view, size, at);
  }

  /** The pointer moved; true while the grip is dragged. */
  move(at: Point, ctrl: boolean): boolean {
    const h = this.held;
    if (!h) return false;
    if (!h.moved && Math.hypot(at.x - h.at.x, at.y - h.at.y) < DRAG_PX) return false;
    h.moved = true;
    [h.pt, h.ctrl] = [this.world(at), ctrl];
    h.drop = this.dropAt(h);
    // The place a node would merge into is shown like a hover (^286).
    this.editor.hover = !h.drop
      ? null
      : 'node' in h.drop
        ? { kind: 'node', id: h.drop.node }
        : { kind: 'segment', edge: h.drop.edge, nodes: h.drop.nodes };
    this.editor.drag = { grip: h.grip, group: h.group.length, merges: h.drop !== null };
    this.preview(h);
    return true;
  }

  /** Where a dragged node would merge if it were let go now: the node or curve under the pointer, not one of those that move. */
  private dropAt(h: Held): Drop | null {
    if (h.grip.type !== 'node') return null;
    const { view } = this.around.screen();
    const skip = new Set([h.grip.node, ...h.group]);
    return dropOf(this.around.map(), h.pt, skip, reachOf(false, view.scale));
  }

  /** The nodes the drag works on: those it moves, and those of where it would merge. */
  private idsOf(h: Held): number[] {
    const ids = gripNodes(h.grip, h.group);
    if (!h.drop) return ids;
    return [...ids, ...('node' in h.drop ? [h.drop.node] : h.drop.nodes)];
  }

  private shaped(h: Held, g: Graph) {
    const { view } = this.around.screen();
    const angle = h.ctrl ? null : { scale: view.scale, from: h.from };
    return dragged(g, h.grip, h.pt, { angle, group: h.group });
  }

  private loadedPiece(ids: number[], next: NextIds): Graph | null {
    const map = this.around.map();
    const edges = [...new Map(ids.flatMap((id) => map.edgesAt(id)).map((e) => [e[0], e])).values()];
    const all = new Set([...ids, ...edges.flatMap((e) => [e[1], e[2]])]);
    const nodes = [...all].map((id) => map.nodeOf(id));
    return nodes.every((n) => n)
      ? graphOfRows(
          nodes.map((n) => n!),
          edges,
          next,
        )
      : null;
  }

  private preview(h: Held) {
    const next = this.editor.ids?.();
    const g = next && this.loadedPiece(gripNodes(h.grip, h.group), next);
    this.editor.draft = g ? changeOfGraphs(g, this.shaped(h, g)) : null;
  }

  /** The button is released: true if it was a drag, which is written in its turn; false for a click. */
  up(): boolean {
    const h = this.held;
    this.held = null;
    this.editor.drag = null;
    if (!h?.moved) return false;
    void this.editor.drawStep(() => this.plan(h));
    return true;
  }

  /** `Esc` (^295): the drag is forgotten; true if there was one. */
  cancel(): boolean {
    const was = this.held !== null;
    this.held = null;
    this.editor.draft = null;
    this.editor.drag = null;
    return was;
  }

  private async plan(h: Held): Promise<Planned | null> {
    const { editor } = this;
    const [source, next] = [editor.source?.(), editor.ids?.()];
    if (!source || !next) return null;
    const before = await readPiece(source, this.idsOf(h), next);
    const moved = this.shaped(h, before);
    const merged = this.mergedIfDropped(h, before, moved);
    const step = {
      name: nameOf(h),
      change: changeOfGraphs(before, merged.graph),
      draw: merged.draw,
    };
    return h.selection ? { ...step, selection: h.selection } : step;
  }

  /** The piece after the drag, merged where the node was let go if that place is still as it was found. */
  private mergedIfDropped(h: Held, before: Graph, moved: Graph) {
    const drop = h.drop;
    if (drop && validDrop(before, drop)) return this.merged(h, moved, drop);
    return { graph: moved, draw: this.editor.draw };
  }

  /** The node let go merges (`main`'s `droppedNode`); the road being drawn and its start follow it. */
  private merged(h: Held, g: Graph, drop: Drop) {
    const id = (h.grip as { node: number }).node;
    const draw = this.editor.draw;
    const into = 'node' in drop ? drop.node : g.nextNodeId;
    const to = (n: number | null) => (n === id ? into : n);
    const r = droppedNode(g, id, drop, to(draw.active));
    return { graph: r.graph, draw: { ...draw, active: to(draw.active), origin: to(draw.origin) } };
  }
}

/** What the step of a drag is called (`main`'s `dragName`). */
function nameOf(h: Held): string {
  if (h.grip.type !== 'node') return NAME[h.grip.type];
  return h.group.length ? `move ${h.group.length + 1} nodes` : 'move node';
}

/** Whether the place a node was let go is still there as it was found: a step written meanwhile may have changed it. */
function validDrop(g: Graph, drop: Drop): boolean {
  if ('node' in drop) return !!nodeOf(g, drop.node);
  const e = edgeOfId(g, drop.edge);
  return !!e && e.start === drop.nodes[0] && e.end === drop.nodes[1];
}

/** What a press holds on to, of what is under the pointer: a node or a control point, else nothing. */
export const gripOf = (on: Hover | null): Grip | null =>
  on?.kind === 'node' ? { type: 'node', node: on.id } : on?.kind === 'handle' ? on.handle : null;

/** The node or curve under a point that a dragged node merges into when it is let go there (^248, ^268); the moving nodes and their segments are left out. */
export function dropOf(
  map: LoadedMap,
  pt: Vec,
  skip: ReadonlySet<number>,
  reach: number,
): Drop | null {
  const node = nodeAt(map, pt, reach, skip);
  if (node) return { node: node[0] };
  const seg = segmentAt(map, pt, reach, skip);
  return seg ? { edge: seg.edge[0], nodes: [seg.edge[1], seg.edge[2]], at: seg.at } : null;
}

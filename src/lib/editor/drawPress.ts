import { screenToWorld, type Point } from '../camera/view';
import { dragHeading } from '../curves/drag';
import type { Sample } from '../curves/piece';
import type { Vec } from '../curves/vec';
import { changeOfGraphs, graphOfRows, readPiece } from '../edit/graphPiece';
import { interactable, segmentAt } from '../map/hit';
import { branchOfNode } from '../map/branch';
import { networkOf } from '../map/network';
import {
  edgeOfId,
  edgesAt,
  edgesOut,
  nodeOf,
  withNode,
  type GEdge,
  type Graph,
} from '../model/graph';
import { NO_CHANGE } from '../edit/change';
import type { EdgeRow } from '../project/storage';
import {
  curveAction,
  extendFrom,
  insertAt,
  mergeInto,
  nodeAction,
  NOT_DRAWING,
  placeNode,
  splitFrom,
  type DrawState,
  type NodeAction,
} from './drawing';
import type { Editor, Mode, Planned } from './editor.svelte';
import type { GhostTarget } from './drawGhost';
import { DRAG_PX, type Surroundings } from './selectPress';
import { pick, reachOf, type Hover } from './pick';

/** Whether a segment of a piece is still the row that was clicked: same nodes and radius. */
const sameEdge = (e: GEdge | undefined, row: EdgeRow) =>
  !!e &&
  e.start === row[1] &&
  e.end === row[2] &&
  (e.radius === null ? row[3] === null : Math.round(e.radius * 1000) === row[3]);

/** How far (pixels) the pointer has to be from a node that is placed before its heading follows the pointer (^40). */
const HEADING_PX = 6;

/** An operation of a press worked out on a piece of the map: the piece after it, its name and the road being drawn after it. */
interface Shaped {
  name: string;
  graph: Graph;
  draw: DrawState;
  /** The node a split on a curve inserted (finishing at once gives the curve back, ^237). */
  split?: number;
}

/**
 * A press of the left button in draw mode: on a node (a click finishes, extends, splits, merges or
 * closes, ^23, ^65, ^162), or a node placed on the void or inserted on a curve, whose heading a drag
 * sets (^40, ^410, ^411, ^708).
 */
type Pressed = {
  at: Point;
  moved: boolean;
  alt: boolean;
} & (
  | { kind: 'node'; id: number }
  | { kind: 'place'; pt: Vec; th: number | null; angleFrom: number | null }
  | { kind: 'curve'; pt: Sample; edge: EdgeRow; th: number | null }
);

/** The heading of a node at `n` turned towards the pointer, with the angle steps unless `Ctrl` holds them off (^251, ^315, ^316). */
function headingTo(
  n: Vec & { th: number },
  pt: Vec,
  angle: { scale: number; from: number } | null,
) {
  return dragHeading({ nodes: [n], radii: [] }, 0, pt, angle).nodes[0]!.th;
}

/**
 * The left button in draw mode (^1262, ported from `main`'s `editor/ops.ts` and `press.ts`). What
 * a press would do is shown as it goes (`Editor.draft`, worked out on the rows that are loaded),
 * and when it ends it is worked out again on the rows read from the storage, in its turn, and
 * written (`Editor.drawStep`).
 */
export class DrawPress {
  private pressed: Pressed | null = null;

  constructor(
    private editor: Editor,
    private around: Surroundings,
  ) {}

  get active() {
    return this.pressed !== null;
  }

  private world(at: Point): Vec {
    const { view, size } = this.around.screen();
    return screenToWorld(view, size, at);
  }

  /** What is under a point of the screen. */
  pickAt(at: Point, touch = false): Hover | null {
    const { view } = this.around.screen();
    return pick(this.around.map(), this.world(at), reachOf(touch, view.scale));
  }

  private degree = (id: number) => this.around.map().edgesAt(id).length;

  /** What is under the pointer for the preview (^40, ^125): a node and whether a click merges into it, a point of a curve, or the void. */
  ghostTarget(at: Point, on: Hover | null): GhostTarget | null {
    if (on?.kind === 'node') {
      const node = this.around.map().nodeOf(on.id);
      const act = this.actOn(on.id);
      return node ? { kind: 'node', node, merges: act === 'merge' || act === 'close' } : null;
    }
    if (on?.kind === 'segment') {
      const hit = this.segmentHit(at);
      return hit && curveAction(this.editor.draw) === 'merge'
        ? { kind: 'curve', at: hit.at }
        : null;
    }
    return { kind: 'void', pt: this.world(at) };
  }

  /** What a click on a node does now. */
  actOn(id: number): NodeAction {
    return nodeAction(this.editor.draw, id, this.degree);
  }

  down(at: Point, alt: boolean) {
    const { view } = this.around.screen();
    // Nothing is placed where the map is still loading: a node of it may be right there (^1257).
    if (!interactable(this.around.map(), this.world(at), reachOf(false, view.scale))) {
      this.editor.told?.('warning', LOADING_TEXT);
      return;
    }
    const on = this.pickAt(at);
    const base = { at, moved: false, alt };
    if (on?.kind === 'node') {
      this.pressed = { ...base, kind: 'node', id: on.id };
      return;
    }
    const hit = on?.kind === 'segment' ? this.segmentHit(at) : null;
    this.pressed = hit
      ? { ...base, kind: 'curve', pt: hit.at, edge: hit.edge, th: null }
      : { ...base, kind: 'place', pt: this.world(at), th: null, angleFrom: null };
    this.preview();
  }

  private segmentHit(at: Point) {
    const { view } = this.around.screen();
    const hit = segmentAt(this.around.map(), this.world(at), reachOf(false, view.scale));
    return hit && { at: hit.at, edge: hit.edge };
  }

  /** The pointer moved: a press that has moved far enough sets the heading of its node (`ctrl`: without the angle steps). */
  move(at: Point, ctrl: boolean) {
    const p = this.pressed;
    if (!p || (!p.moved && Math.hypot(at.x - p.at.x, at.y - p.at.y) < DRAG_PX)) return;
    p.moved = true;
    if (p.kind === 'node') return;
    if (Math.hypot(at.x - p.at.x, at.y - p.at.y) < HEADING_PX) return;
    const { view } = this.around.screen();
    const node = this.unturned(p);
    if (!node) return;
    // The first node of a road turns in steps from the compass directions, any other from its own heading (^315, ^316).
    const from = p.kind === 'place' && this.editor.draw.active === null ? 0 : node.th;
    p.th = headingTo(node, this.world(at), ctrl ? null : { scale: view.scale, from });
    this.preview();
  }

  /** The node the press placed or inserted, with the heading it has before it is turned (the automatic one, or the curve's). */
  private unturned(p: Exclude<Pressed, { kind: 'node' }>) {
    const g = this.loadedPiece(p);
    const next = this.editor.ids?.();
    if (!g || !next) return undefined;
    return nodeOf(this.shape({ ...p, th: null }, g, false).graph, next.node);
  }

  /**
   * The button is released: the press is written, in its turn (`Editor.drawStep`), worked out
   * then from the road being drawn and the rows stored then: a press that came while an earlier
   * one was written goes on from where that one left the map.
   */
  up() {
    const p = this.pressed;
    this.pressed = null;
    if (!p) return;
    if (p.kind === 'node') {
      if (!p.moved) void this.editor.drawStep(() => this.planNodeClick(p.id, p.alt));
      return;
    }
    void this.editor.drawStep(() => this.planPress(p, !p.moved));
  }

  private async planPress(p: Exclude<Pressed, { kind: 'node' }>, click: boolean) {
    const [source, next] = [this.editor.source?.(), this.editor.ids?.()];
    if (!source || !next) return null;
    const before = await readPiece(source, this.idsOf(p), next);
    // The curve was changed by a step written meanwhile: the point clicked is not on it any more.
    if (p.kind === 'curve' && !sameEdge(edgeOfId(before, p.edge[0]), p.edge)) return null;
    const shaped = this.shape(p, before, click);
    return { ...shaped, change: changeOfGraphs(before, shaped.graph) };
  }

  /** Esc or a second finger: the press is forgotten, nothing is written (^295); true if there was one. */
  cancel(): boolean {
    const was = this.pressed !== null;
    this.pressed = null;
    this.editor.draft = null;
    return was;
  }

  /** The nodes whose rows (with their segments) the press works on. */
  private idsOf(p: Pressed): number[] {
    const active = this.editor.draw.active;
    if (p.kind === 'curve') return [...(active === null ? [] : [active]), p.edge[1], p.edge[2]];
    return active === null ? [] : [active];
  }

  /** What the press does to a piece of the map: a node placed or inserted, its heading, and on a curve what a click does there (^133, ^191). */
  private shape(p: Exclude<Pressed, { kind: 'node' }>, g: Graph, click: boolean): Shaped {
    const draw = this.editor.draw;
    if (p.kind === 'place') {
      const r = placeNode(g, draw, { pt: p.pt, th: p.th });
      return { name: 'place node', graph: r.graph, draw: r.draw };
    }
    const r = insertAt(g, p.edge[0], p.pt);
    const graph = p.th === null ? r.graph : withNode(r.graph, r.id, { th: p.th });
    if (!click) return { name: 'insert node', graph, draw };
    if (curveAction(draw) === 'split')
      return { name: 'split road', graph, draw: splitFrom(r.id), split: r.id };
    return { name: 'merge road', graph: mergeInto(graph, draw, r.id), draw: NOT_DRAWING };
  }

  /** The piece of the press from the rows that are loaded, for the preview; null when not all of it is loaded. */
  private loadedPiece(p: Pressed): Graph | null {
    const next = this.editor.ids?.();
    if (!next) return null;
    const map = this.around.map();
    const ids = this.idsOf(p);
    const edges = [...new Map(ids.flatMap((id) => map.edgesAt(id)).map((e) => [e[0], e])).values()];
    const all = new Set([...ids, ...edges.flatMap((e) => [e[1], e[2]])]);
    const nodes = [...all].map((id) => map.nodeOf(id));
    if (nodes.some((n) => !n)) return null;
    return graphOfRows(
      nodes.map((n) => n!),
      edges,
      next,
    );
  }

  /** Show what the press would do, worked out on what is loaded. */
  private preview() {
    const p = this.pressed;
    if (!p || p.kind === 'node') return;
    const g = this.loadedPiece(p);
    this.editor.draft = g ? changeOfGraphs(g, this.shape(p, g, false).graph) : null;
  }

  /** A click on a node in draw mode (^23, ^65, ^162, ^916): what it does is decided in its turn, from the road being drawn and the segments stored at the node then. */
  private async planNodeClick(id: number, alt: boolean): Promise<Planned | null> {
    const { editor } = this;
    const [source, next, draw] = [editor.source?.(), editor.ids?.(), editor.draw];
    if (!source || !next) return null;
    const before = await readPiece(source, draw.active === null ? [id] : [draw.active, id], next);
    if (!nodeOf(before, id)) return null;
    const act = nodeAction(draw, id, (n) => edgesAt(before, n).length);
    return act === 'finish' || act === 'cancel'
      ? editor.planFinish()
      : this.planAct(act, { id, alt }, before, draw);
  }

  /** What a click on a node does, other than finishing: extend, split, merge or close. */
  private planAct(
    act: Exclude<NodeAction, 'finish' | 'cancel'>,
    { id, alt }: { id: number; alt: boolean },
    before: Graph,
    draw: DrawState,
  ): Planned {
    const only = (name: string, d: DrawState) => ({ name, change: NO_CHANGE, draw: d });
    if (act === 'extend') return only('extend road', this.extended(id, alt, before));
    if (act === 'split') return only('split road', splitFrom(id));
    const name = act === 'close' ? 'close road' : 'merge road';
    return { name, change: changeOfGraphs(before, mergeInto(before, draw, id)), draw: NOT_DRAWING };
  }

  /** Extend from a leaf node (^65, ^916): the road started at the other end of its branch, as far as it is loaded. */
  private extended(id: number, alt: boolean, g: Graph): DrawState {
    const net = networkOf(this.around.map());
    const out = edgesOut(g, id).length;
    const branch = branchOfNode(net, id);
    const ends = branch.nodes.filter((n) => n !== id && net.edgesAt(n).length !== 2);
    return extendFrom(id, out, alt, ends[0] ?? branch.nodes.at(-1) ?? id);
  }
}

/** The cursor (`main`'s `cursorOf`): in draw mode a cross on the void, a copy sign on a curve (a click inserts there), a hand on a node. */
export function cursorOf(mode: Mode, hover: Hover | null): string {
  if (mode !== 'draw') return 'default';
  if (hover?.kind === 'node') return 'pointer';
  return hover?.kind === 'segment' ? 'copy' : 'crosshair';
}

export const LOADING_TEXT = 'The map here is still loading: nothing was placed.';

import { dist } from './curves/vec';
import { dragPress, emptyPress } from './editorPress';
import {
  dragStep,
  insertAt,
  mergeInto,
  placementAt,
  placeNode,
  placeStep,
  splitAt,
} from './editorOps';
import { skeletonAnchors } from './skeletonAnchors';
import { cursorOf, extendTo, mergePreview, targetOf, type Drawn } from './editorTargets';
import { actionFor, type Action, type KeyMods } from './keymap';
import { NO_HISTORY, record, redoStep, undoStep } from './history';
import type { Pointer } from './proximity';
import { DRAG_PX, type Hover, type PointerInfo, type Press, type Snapshot } from './editorTypes';
import { curveAt, focusOf, handleAt, hoverAt } from './editorHits';
import {
  chainHandles,
  chainSegments,
  chainsOf,
  type RoadHandle,
  type RoadHit,
} from './model/chains';
import { edgesIn, edgesOut, emptyGraph, nodeOf, removeNodes, type Graph } from './model/graph';
import {
  afterBranchClick,
  afterCurveClick,
  nodesInBand,
  selectedSegments,
  sameSelection,
  withNodes,
  withoutNode,
  type Band,
} from './selection';

export type { Hover, PointerInfo } from './editorTypes';

/**
 * The road editor: the graph, the road being drawn, selection and pointer interaction (^40, ^42).
 * No drawing and no view (zoom/pan) logic: the canvas component feeds it pointer events in world
 * coordinates (^12).
 *
 * Two modes (^48, ^54): in select mode the left button edits handles, and a click on empty
 * canvas enters draw mode (it does not place a node yet). In draw mode it places nodes, the first
 * one starting a new road, inserts nodes on curves, and still edits handles.
 */
export class Editor {
  graph = $state.raw<Graph>(emptyGraph());
  mode = $state<'select' | 'draw'>('select');
  /** The node being drawn from, null in select mode or before the first node. */
  active = $state<number | null>(null);
  /** Which way the next edge runs from the node being drawn from (^65). */
  end = $state<'start' | 'end'>('end');
  /** The node the road being drawn started at (a click on it closes a loop, ^162). */
  origin = $state<number | null>(null);
  /** Where the pointer is, for showing handles that are near it (^55). */
  pointer = $state.raw<Pointer | null>(null);
  /** The selected nodes (^70); the last one is `sel`. */
  selection = $state.raw<number[]>([]);
  /** The selection box while it is dragged, in screen pixels. */
  band = $state.raw<Band | null>(null);
  hover = $state.raw<Hover | null>(null);
  private press = $state.raw<Press | null>(null);
  /** The steps that can be undone and redone (^81). */
  history = $state.raw(NO_HISTORY);
  /** True while the end of a press runs, so everything it does is one step. */
  private batching = false;

  canUndo = $derived(this.history.past.length > 0);
  canRedo = $derived(this.history.future.length > 0);
  sel = $derived(this.selection.at(-1) ?? null);
  drawing = $derived(this.mode === 'draw');
  /** The chains of the graph, the shape the curve code and the drawing work on (^106). */
  chains = $derived(chainsOf(this.graph));
  edges = $derived(this.chains.map((c) => c.edges));
  /** The skeleton of all roads, for the camera bounds (^37, ^62). */
  anchors = $derived(skeletonAnchors(this.chains));
  cursor = $derived(cursorOf(this.hover, this.drawing));
  /** The handle being hovered or dragged, or the node being placed (reveals its gizmos, ^51). */
  focus = $derived(focusOf(this.chains, this.press, this.hover));
  /** What the control hints are about (^49). */
  hintTarget = $derived(this.press?.target ?? targetOf(this.drawn, this.hover, this.drawing));

  private get drawn(): Drawn {
    return this.snapshot();
  }

  handles(scale: number): RoadHandle[] {
    return chainHandles(this.chains, scale);
  }

  private snapshot(): Snapshot {
    const { graph, active, end, origin, selection } = this;
    return { graph, active, end, origin, selection };
  }

  /** Handle a key; true if it was bound. */
  key(key: string, mods: KeyMods = { ctrl: false, shift: false }): boolean {
    const action: Action | undefined = actionFor(key, mods);
    if (action === 'finishRoad') this.finishRoad();
    else if (action === 'deleteNode') this.deleteSelected();
    else if (action) this.step(action);
    return action !== undefined;
  }

  /** Undo or redo one step (^81); not while the left button is down. */
  private step(action: 'undo' | 'redo') {
    const go = action === 'undo' ? undoStep : redoStep;
    const r = this.press ? null : go(this.history, this.snapshot());
    if (r) [this.history, this.hover] = [r.history, null];
    if (r) this.restore(r.to);
  }

  private restore({ graph, active, end, origin, selection }: Snapshot) {
    [this.graph, this.active, this.end, this.origin, this.selection] = [
      graph,
      active,
      end,
      origin,
      selection,
    ];
    if (active !== null) this.mode = 'draw';
  }

  /** Make a step undoable if it changed the graph or the selection (^88). Inside a press only its end commits. */
  private commit(before: Snapshot) {
    const same = before.graph === this.graph && sameSelection(before.selection, this.selection);
    if (!same && !this.batching) this.history = record(this.history, before);
  }

  deleteSelected() {
    this.removeAll(this.selection);
  }

  /** The node the road being drawn goes on from when its node is removed: the one before it. */
  private neighbour(): number | null {
    const { graph, active, end } = this;
    if (active === null) return null;
    const e = (end === 'end' ? edgesIn(graph, active) : edgesOut(graph, active))[0];
    return e ? (end === 'end' ? e.start : e.end) : null;
  }

  private removeAll(ids: number[]) {
    if (!ids.length) return;
    const before = this.snapshot();
    const tip = this.active !== null && ids.includes(this.active) ? this.neighbour() : this.active;
    this.graph = removeNodes(this.graph, ids, tip);
    const alive = (id: number | null) => (id !== null && nodeOf(this.graph, id) ? id : null);
    this.active = alive(tip);
    this.origin = alive(this.origin);
    if (this.active === null) this.end = 'end';
    this.selection = [];
    this.commit(before);
  }

  /** Enter draw mode: the next click places the first node of a new road. */
  enterDrawMode() {
    this.mode = 'draw';
    this.selection = [];
  }

  /** Leave draw mode; a road being drawn with fewer than two nodes is cancelled. */
  finishRoad() {
    if (this.mode === 'select') return;
    const before = this.snapshot();
    this.graph = removeNodes(this.graph, [], null);
    this.mode = 'select';
    [this.active, this.origin, this.end, this.selection] = [null, null, 'end', []];
    this.commit(before);
  }

  /** Left button pressed. */
  pointerDown(info: PointerInfo) {
    this.hover = null;
    this.pointer = { pt: info.pt, scale: info.scale };
    const handle = handleAt(this.handles(info.scale), info);
    if (handle) return this.grab(handle, info);
    const hit = curveAt(this.chains, info);
    if (!this.drawing) {
      this.press = emptyPress(this.drawn, info, hit);
      return;
    }
    if (hit) this.onCurve(hit);
    else this.place(info);
  }

  private grab(handle: RoadHandle, info: PointerInfo) {
    const r = dragPress(this.drawn, this.drawing, handle, info);
    this.selection = r.selection;
    this.press = r.press;
  }

  /** A press on a curve in draw mode: a node is inserted, and the road splits off it or merges into it (^23). */
  private onCurve(hit: RoadHit) {
    const undo = this.snapshot();
    const act = targetOf(this.drawn, { kind: 'candidate', hit }, true);
    const r = insertAt(this.drawn, hit);
    const kind = act.kind === 'curve' ? act.act : null;
    const then = kind === 'split' || kind === 'merge' ? kind : null;
    this.restore(r.drawn);
    this.press = { kind: 'place', id: r.id, undo, then, moved: false, target: act };
  }

  /** A click on a curve ends in a split or merge at the inserted node; a drag only inserts it (^133). */
  private clickedCurve(press: Extract<Press, { kind: 'place' }>) {
    if (press.moved || !press.then) return;
    if (press.then === 'split') this.restore(splitAt(this.drawn, press.id));
    else this.merge(press.id);
  }

  /** A node at the end of the road being drawn, or the first node of a new road (^40). */
  private place(info: PointerInfo) {
    const undo = this.snapshot();
    const r = placeNode(this.drawn, placementAt(info.pt));
    this.restore(r.drawn);
    const target = { kind: 'empty' } as const;
    this.press = { kind: 'place', id: r.id, undo, then: null, moved: false, target };
  }

  pointerMove(info: PointerInfo) {
    this.pointer = { pt: info.pt, scale: info.scale };
    const press = this.press;
    if (!press) {
      const hits = { handles: this.handles(info.scale), chains: this.chains };
      this.hover = hoverAt(this.drawn, hits, info, this.drawing);
    } else if (press.kind === 'drag') this.moveDrag(press, info);
    else if (press.kind === 'place') this.moveHeading(press, info);
    else this.moveBand(press, info);
  }

  private moveDrag(press: Extract<Press, { kind: 'drag' }>, info: PointerInfo) {
    if (!press.moved && dist(info.pt, press.start) <= DRAG_PX / info.scale) return;
    press.moved = true;
    this.graph = dragStep(this.drawn, press, info);
  }

  /** The segments whose two nodes are selected, as (chain, index) pairs (^133). */
  get selectedSegments() {
    return chainSegments(this.chains, selectedSegments(this.graph, this.selection));
  }

  /** The curve a merge into the node or curve under the pointer would add (^123, ^125). */
  get mergePreview() {
    return mergePreview(this.drawn, this.hover);
  }

  /** Moving several nodes hides all scaffolds meanwhile (^78). */
  get movingGroup() {
    const press = this.press;
    return press?.kind === 'drag' && press.moved && press.group.length > 0;
  }

  private moveHeading(press: Extract<Press, { kind: 'place' }>, info: PointerInfo) {
    const next = placeStep(this.graph, press.id, info);
    if (next === this.graph) return;
    this.graph = next;
    press.moved = true;
  }

  /** Dragging on empty canvas spans the selection box; shift keeps the selection and adds to it (^70, ^72). */
  private moveBand(press: Extract<Press, { kind: 'empty' }>, info: PointerInfo) {
    if (!press.moved && dist(info.screen, press.screen) <= DRAG_PX) return;
    press.moved = true;
    this.band = { a: press.screen, b: info.screen };
    this.selection = withNodes(press.base, nodesInBand(this.graph, this.band, info.project));
  }

  private clickedEmpty(press: Extract<Press, { kind: 'empty' }>) {
    const { curve, shift } = press;
    if (curve.length) {
      this.selection = press.alt
        ? afterBranchClick(this.selection, curve)
        : afterCurveClick(this.selection, curve, shift);
    } else if (shift) return;
    else if (this.selection.length) this.selection = [];
    else this.enterDrawMode();
  }

  private extendFrom(id: number) {
    const before = this.snapshot();
    this.restore(extendTo(this.drawn, id));
    this.commit(before);
  }

  /** A click (no drag) on a node: toggles it, or in draw mode finishes, extends, splits or merges the road (^23, ^65). */
  private clickedHandle(press: Extract<Press, { kind: 'drag' }>) {
    const id = press.id;
    if (press.click === 'toggle') this.selection = withoutNode(this.selection, id);
    else if (press.click === 'collapse' && press.group.length) this.selection = [id];
    if (press.act === 'finish') this.finishRoad();
    else if (press.act === 'extend') this.extendFrom(id);
    else if (press.act === 'split') this.restore(splitAt(this.drawn, id));
    else if (press.act === 'merge' || press.act === 'close') this.merge(id);
  }

  private merge(id: number) {
    this.restore(mergeInto(this.drawn, id));
    this.finishRoad();
  }

  /** Left button released. */
  pointerUp() {
    const press = this.press;
    this.press = null;
    this.band = null;
    if (!press) return;
    this.batching = true;
    if (press.kind === 'drag' && !press.moved) this.clickedHandle(press);
    if (press.kind === 'empty' && !press.moved) this.clickedEmpty(press);
    if (press.kind === 'place') this.clickedCurve(press);
    this.batching = false;
    this.commit(press.undo);
  }

  /** Abort what the left button was doing (a second finger came down). */
  cancelPress() {
    const press = this.press;
    this.press = null;
    this.band = null;
    if (!press || press.kind === 'empty') return;
    this.restore(press.undo);
  }

  pointerLeave() {
    if (this.press) return;
    this.hover = null;
    this.pointer = null;
  }

  /** Right click without moving: removes the node under the pointer, else finishes the road. */
  rightClick(info: PointerInfo) {
    const handle = handleAt(this.handles(info.scale), info);
    if (handle?.type === 'node') this.removeAll([handle.id]);
    else this.finishRoad();
  }
}

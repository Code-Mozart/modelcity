import { closeOver } from './curves/junctions';
import {
  edgesOfRoads,
  removeNodesFrom,
  removeRoad,
  roadHandles,
  type NodeRef,
  type RoadHandle,
  type RoadHit,
  type Roads,
} from './curves/roads';
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
import { focusOf, handleAt, curveAt, hoverAt } from './editorHits';
import { cursorOf, extendTo, mergePreview, targetOf, type Drawn } from './editorTargets';
import { actionFor, type Action, type KeyMods } from './keymap';
import { NO_HISTORY, record, redoStep, undoStep } from './history';
import type { Pointer } from './proximity';
import { DRAG_PX, type Hover, type PointerInfo, type Press, type Snapshot } from './editorTypes';
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
 * The road editor: roads, the road being drawn, selection and pointer interaction (^40, ^42). No
 * drawing and no view (zoom/pan) logic: the canvas component feeds it pointer events in world
 * coordinates (^12).
 *
 * Two modes (^48, ^54): in select mode the left button edits handles, and a click on empty
 * canvas enters draw mode (it does not place a node yet). In draw mode it places nodes, the first
 * one starting a new road, inserts nodes on curves, and still edits handles.
 */
export class Editor {
  roads = $state.raw<Roads>([]);
  mode = $state<'select' | 'draw'>('select');
  /** Index of the road being drawn, null in select mode or before its first node. */
  active = $state<number | null>(null);
  /** The end of the road being drawn that new nodes are added to (^65). */
  end = $state<'start' | 'end'>('end');
  /** Where the pointer is, for showing handles that are near it (^55). */
  pointer = $state.raw<Pointer | null>(null);
  /** The selected nodes (^70); the last one is `sel`. */
  selection = $state.raw<NodeRef[]>([]);
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
  edges = $derived(edgesOfRoads(this.roads));
  /** The skeleton of all roads, for the camera bounds (^37, ^62). */
  anchors = $derived(skeletonAnchors(this.roads, this.edges));
  cursor = $derived(cursorOf(this.hover, this.drawing));
  /** The handle being hovered or dragged, or the node being placed (reveals its gizmos, ^51). */
  focus = $derived(focusOf(this.press, this.hover));
  /** What the control hints are about (^49). */
  hintTarget = $derived(this.press?.target ?? targetOf(this.drawn, this.hover, this.drawing));

  private get drawn(): Drawn {
    return { roads: this.roads, active: this.active, end: this.end, selection: this.selection };
  }

  handles(scale: number): RoadHandle[] {
    return roadHandles(this.roads, this.edges, scale);
  }

  private snapshot(): Snapshot {
    return { roads: this.roads, active: this.active, end: this.end, selection: this.selection };
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

  private restore({ roads, active, end, selection }: Snapshot) {
    [this.roads, this.active, this.end, this.selection] = [roads, active, end, selection];
    if (active !== null) this.mode = 'draw';
  }

  /** Make a step undoable if it changed the roads or the selection (^88). Inside a press only its end commits. */
  private commit(before: Snapshot) {
    const same = before.roads === this.roads && sameSelection(before.selection, this.selection);
    if (!same && !this.batching) this.history = record(this.history, before);
  }

  deleteSelected() {
    this.removeAll(this.selection);
  }

  private removeAll(refs: NodeRef[]) {
    if (!refs.length) return;
    const before = this.snapshot();
    const r = removeNodesFrom(this.roads, closeOver(this.roads, refs), this.active);
    this.roads = r.roads;
    this.active = r.active;
    if (r.active === null) this.end = 'end';
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
    const road = this.active;
    const before = this.snapshot();
    const cancel = road !== null && (this.roads[road]?.nodes.length ?? 0) < 2;
    if (road !== null && cancel) this.roads = removeRoad(this.roads, road, road).roads;
    this.mode = 'select';
    this.active = null;
    this.end = 'end';
    this.selection = [];
    this.commit(before);
  }

  /** Left button pressed. */
  pointerDown(info: PointerInfo) {
    this.hover = null;
    this.pointer = { pt: info.pt, scale: info.scale };
    const handle = handleAt(this.roads, this.edges, info);
    if (handle) return this.grab(handle, info);
    if (!this.drawing) {
      this.press = emptyPress(this.drawn, info, curveAt(this.roads, info));
      return;
    }
    const hit = curveAt(this.roads, info);
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
    this.press = { kind: 'place', ref: r.ref, undo, then, moved: false, target: act };
  }

  /** A click on a curve ends in a split or merge at the inserted node; a drag only inserts it (^133). */
  private clickedCurve(press: Extract<Press, { kind: 'place' }>) {
    if (press.moved || !press.then) return;
    if (press.then === 'split') this.restore(splitAt(this.drawn, press.ref));
    else this.merge(press.ref);
  }

  /** A node at the end of the road being drawn, or the first node of a new road (^40). */
  private place(info: PointerInfo) {
    const undo = this.snapshot();
    const r = placeNode(this.drawn, placementAt(info.pt));
    this.restore(r.drawn);
    const target = { kind: 'empty' } as const;
    this.press = { kind: 'place', ref: r.ref, undo, then: null, moved: false, target };
  }

  pointerMove(info: PointerInfo) {
    this.pointer = { pt: info.pt, scale: info.scale };
    const press = this.press;
    if (!press) this.hover = hoverAt(this.drawn, this.edges, info, this.drawing);
    else if (press.kind === 'drag') this.moveDrag(press, info);
    else if (press.kind === 'place') this.moveHeading(press, info);
    else this.moveBand(press, info);
  }

  private moveDrag(press: Extract<Press, { kind: 'drag' }>, info: PointerInfo) {
    if (!press.moved && dist(info.pt, press.start) <= DRAG_PX / info.scale) return;
    press.moved = true;
    this.roads = dragStep(this.drawn, press, info);
  }

  /** The segments whose two nodes are selected (^133). */
  get selectedSegments() {
    return selectedSegments(this.roads, this.selection);
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
    const next = placeStep(this.roads, press.ref, info);
    if (next === this.roads) return;
    this.roads = next;
    press.moved = true;
  }

  /** Dragging on empty canvas spans the selection box; shift keeps the selection and adds to it (^70, ^72). */
  private moveBand(press: Extract<Press, { kind: 'empty' }>, info: PointerInfo) {
    if (!press.moved && dist(info.screen, press.screen) <= DRAG_PX) return;
    press.moved = true;
    this.band = { a: press.screen, b: info.screen };
    const inside = nodesInBand(this.roads, this.band, info.project);
    this.selection = withNodes(press.base, inside);
  }

  private clickedEmpty(press: Extract<Press, { kind: 'empty' }>) {
    const { curve, shift } = press;
    const next = press.alt
      ? afterBranchClick(this.selection, curve)
      : afterCurveClick(this.selection, curve, shift);
    if (curve.length) this.selection = closeOver(this.roads, next);
    else if (shift) return;
    else if (this.selection.length) this.selection = [];
    else this.enterDrawMode();
  }

  private extendFrom(ref: NodeRef) {
    const before = this.snapshot();
    this.restore(extendTo(this.drawn, ref));
    this.commit(before);
  }

  /** A click (no drag) on a node: toggles it, or in draw mode finishes, extends, splits or merges the road (^23, ^65). */
  private clickedHandle(press: Extract<Press, { kind: 'drag' }>) {
    const ref = { road: press.road, node: press.drag.handle.i };
    const group = closeOver(this.roads, [ref]);
    if (press.click === 'toggle') this.selection = group.reduce(withoutNode, this.selection);
    else if (press.click === 'collapse' && press.group.length) this.selection = group;
    if (press.act === 'finish') this.finishRoad();
    else if (press.act === 'extend') this.extendFrom(ref);
    else if (press.act === 'split') this.restore(splitAt(this.drawn, ref));
    else if (press.act === 'merge') this.merge(ref);
  }

  private merge(ref: NodeRef) {
    this.restore(mergeInto(this.drawn, ref));
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
    const handle = handleAt(this.roads, this.edges, info);
    if (handle?.type === 'node') this.removeAll([{ road: handle.road, node: handle.i }]);
    else this.finishRoad();
  }
}

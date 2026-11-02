import { dist } from '../curves/vec';
import { dragPress, emptyPress } from './press';
import {
  dragStep,
  extendTo,
  insertAt,
  mergeInto,
  removeNodesFrom,
  removeSegmentFrom,
  placementAt,
  placeNode,
  placeStep,
  splitAt,
} from './ops';
import { skeletonAnchors } from '../camera/skeletonAnchors';
import { cursorOf, mergePreview, targetOf } from './targets';
import { actionFor, type Action, type KeyMods } from './keymap';
import { NO_HISTORY, redoStep, undoStep, type HistoryEvent, type Step } from './history';
import type { ControlId } from '../hints/hints';
import { pressName, takeStep } from './stepNames';
import { controlUsed } from './usage';
import type { Pointer } from './proximity';
import { DRAG_PX, type Hover, type PointerInfo, type Press, type Snapshot } from './types';
import { curveAt, focusOf, handleAt, hoverAt } from './hits';
import { chainHandles, chainSegments, chainsOf, type RoadHandle, type RoadHit } from './chains';
import { emptyGraph, removeNodes, roundToMm, sameGraph, type Graph } from '../model/graph';
import {
  afterEmptyClick,
  hoveredEdges,
  nodesInBand,
  selectedSegments,
  sameSelection,
  withNodes,
  withoutNode,
  type Band,
} from './selection';

export type { Hover, PointerInfo } from './types';

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
  private eventCount = 0;

  private use(id: ControlId | null) {
    if (id) this.used = { seq: (this.used?.seq ?? 0) + 1, id };
  }
  /** Alt was held at the last pointer move (the hovered branch, ^99). */
  private altHeld = $state(false);
  /** The last control used that has a hint that is hidden once it is learned (^110). */
  used = $state.raw<{ seq: number; id: ControlId } | null>(null);
  /** True while the end of a press runs, so everything it does is one step. */
  private batching = false;

  /** The last thing that happened to the history, for the recent history panel (^107). */
  event = $state.raw<HistoryEvent | null>(null);

  canUndo = $derived(this.history.past.length > 0);
  canRedo = $derived(this.history.future.length > 0);
  /** The node last picked. */
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
  hintTarget = $derived(this.press?.target ?? targetOf(this.snapshot(), this.hover, this.drawing));

  handles(scale: number): RoadHandle[] {
    return chainHandles(this.chains, scale);
  }

  /** The state the pure editing functions work on and undo returns to. */
  private snapshot(): Snapshot {
    const { graph, active, end, origin, selection } = this;
    return { graph, active, end, origin, selection };
  }

  /** Handle a key; true if it was bound. */
  key(key: string, mods: KeyMods = { ctrl: false, shift: false }): boolean {
    const action: Action | undefined = actionFor(key, mods);
    if (action === 'escape') this.escape();
    else if (action === 'deleteNode') this.deleteSelected();
    else if (action) this.move(action);
    return action !== undefined;
  }

  /** Undo or redo a step (^81) or a whole batch (^103); not while the left button is down. */
  private move(action: 'undo' | 'redo' | 'undoBatch' | 'redoBatch') {
    if (this.press) return;
    const go = action.startsWith('undo') ? undoStep : redoStep;
    const r = go(this.history, action.endsWith('Batch'));
    if (!r) return;
    [this.history, this.hover] = [r.history, null];
    this.restore(r.to);
    this.announce(action.slice(0, 4) as 'undo' | 'redo', r.steps);
    this.use(action.startsWith('undo') ? 'undo' : 'redo');
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

  /** Make a step undoable if it changed the graph or the selection (^88), and round it to the millimeter (^170). Inside a press only its end commits. */
  private commit(before: Snapshot, name: string) {
    if (this.batching) return;
    this.graph = roundToMm(this.graph);
    // A graph with the same content stays the object it was (a drag back to where it began), so nothing else sees a change.
    if (sameGraph(before.graph, this.graph)) this.graph = before.graph;
    if (before.graph === this.graph && sameSelection(before.selection, this.selection)) return;
    const r = takeStep(this.history, before, this.snapshot(), name);
    this.history = r.history;
    this.announce('step', [r.step]);
  }

  private announce(kind: HistoryEvent['kind'], steps: Step[]) {
    this.event = { seq: ++this.eventCount, kind, steps };
  }

  /** Replace everything by another map (a project was opened): no selection, no drawing, no history. */
  load(graph: Graph) {
    this.graph = graph;
    this.leaveDrawing();
    [this.press, this.band, this.hover, this.pointer] = [null, null, null, null];
    this.history = NO_HISTORY;
    this.event = null;
  }

  deleteSelected() {
    if (this.selection.length) this.use('delete-selected');
    this.removeAll(this.selection);
  }

  private removeAll(ids: number[]) {
    if (!ids.length) return;
    const before = this.snapshot();
    this.restore(removeNodesFrom(before, ids));
    this.commit(before, ids.length === 1 ? 'delete node' : `delete ${ids.length} nodes`);
  }

  /** Remove one segment (^160): the road being drawn goes on from where it was, else from its neighbour. */
  private removeSegment(edge: number) {
    const before = this.snapshot();
    this.restore(removeSegmentFrom(before, edge));
    this.commit(before, 'remove segment');
  }

  /** Select mode, no road being drawn, nothing selected. */
  private leaveDrawing() {
    this.mode = 'select';
    [this.active, this.origin, this.end, this.selection] = [null, null, 'end', []];
  }

  /** Esc: finish the road being drawn, or with none deselect all (^218). */
  private escape() {
    if (this.mode === 'draw') return this.finishRoad();
    if (!this.selection.length) return;
    const before = this.snapshot();
    this.selection = [];
    this.commit(before, 'deselect all');
    this.use('deselect-all');
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
    this.leaveDrawing();
    this.commit(before, 'finish road');
  }

  /** Left button pressed. */
  pointerDown(info: PointerInfo) {
    this.hover = null;
    this.pointer = { pt: info.pt, scale: info.scale };
    const handle = handleAt(this.handles(info.scale), info);
    if (handle) return this.grab(handle, info);
    const hit = curveAt(this.chains, info);
    if (!this.drawing) {
      this.press = emptyPress(this.snapshot(), info, hit);
      return;
    }
    if (hit) this.onCurve(hit);
    else this.place(info);
  }

  private grab(handle: RoadHandle, info: PointerInfo) {
    const r = dragPress(this.snapshot(), this.drawing, handle, info);
    this.selection = r.selection;
    this.press = r.press;
  }

  /** A press on a curve in draw mode: a node is inserted, and the road splits off it or merges into it (^23). */
  private onCurve(hit: RoadHit) {
    const undo = this.snapshot();
    const act = targetOf(this.snapshot(), { kind: 'candidate', hit }, true);
    const r = insertAt(this.snapshot(), hit);
    const kind = act.kind === 'curve' ? act.act : null;
    const then = kind === 'split' || kind === 'merge' ? kind : null;
    this.restore(r.drawn);
    this.press = { kind: 'place', id: r.id, undo, then, moved: false, target: act };
  }

  /** A click on a curve ends in a split or merge at the inserted node; a drag only inserts it (^133). */
  private clickedCurve(press: Extract<Press, { kind: 'place' }>) {
    if (press.moved || !press.then) return;
    if (press.then === 'split') this.restore(splitAt(this.snapshot(), press.id));
    else this.merge(press.id);
  }

  /** A node at the end of the road being drawn, or the first node of a new road (^40). */
  private place(info: PointerInfo) {
    const undo = this.snapshot();
    const r = placeNode(this.snapshot(), placementAt(info.pt));
    this.restore(r.drawn);
    const target = { kind: 'empty' } as const;
    this.press = { kind: 'place', id: r.id, undo, then: null, moved: false, target };
  }

  pointerMove(info: PointerInfo) {
    this.altHeld = info.alt;
    this.pointer = { pt: info.pt, scale: info.scale };
    const press = this.press;
    if (!press) {
      const hits = { handles: this.handles(info.scale), chains: this.chains };
      this.hover = hoverAt(this.snapshot(), hits, info, this.drawing);
    } else if (press.kind === 'drag') this.moveDrag(press, info);
    else if (press.kind === 'place') this.moveHeading(press, info);
    else this.moveBand(press, info);
  }

  private moveDrag(press: Extract<Press, { kind: 'drag' }>, info: PointerInfo) {
    if (!press.moved && dist(info.pt, press.start) <= DRAG_PX / info.scale) return;
    press.moved = true;
    this.graph = dragStep(this.snapshot(), press, info);
  }

  /** The segments whose two nodes are selected, as (chain, index) pairs (^133). */
  get selectedSegments() {
    return chainSegments(this.chains, selectedSegments(this.graph, this.selection));
  }

  /** The segments under the pointer that get an outline: the one, or with Alt held the whole branch (^99, ^128). */
  get hoverSegments() {
    return chainSegments(this.chains, hoveredEdges(this.graph, this.hover, this.altHeld));
  }

  /** The curve a merge into the node or curve under the pointer would add (^123, ^125). */
  get mergePreview() {
    return mergePreview(this.snapshot(), this.hover);
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
    const next = afterEmptyClick(this.selection, press);
    if (next) this.selection = next;
    else this.enterDrawMode();
  }

  private extendFrom(id: number) {
    const before = this.snapshot();
    this.restore(extendTo(this.snapshot(), id));
    this.commit(before, 'extend road');
  }

  /** A click (no drag) on a node: toggles it, or in draw mode finishes, extends, splits or merges the road (^23, ^65). */
  private clickedHandle(press: Extract<Press, { kind: 'drag' }>) {
    const id = press.id;
    if (press.click === 'toggle') this.selection = withoutNode(this.selection, id);
    else if (press.click === 'collapse' && press.group.length) this.selection = [id];
    if (press.act === 'finish') this.finishRoad();
    else if (press.act === 'extend') this.extendFrom(id);
    else if (press.act === 'split') this.restore(splitAt(this.snapshot(), id));
    else if (press.act === 'merge' || press.act === 'close') this.merge(id);
  }

  private merge(id: number) {
    this.restore(mergeInto(this.snapshot(), id));
    this.finishRoad();
  }

  /** The press is over: take it, and the selection box that belonged to it. */
  private endPress(): Press | null {
    const press = this.press;
    [this.press, this.band] = [null, null];
    return press;
  }

  /** Left button released. */
  pointerUp() {
    const press = this.endPress();
    if (!press) return;
    this.batching = true;
    if (press.kind === 'drag' && !press.moved) this.clickedHandle(press);
    if (press.kind === 'empty' && !press.moved) this.clickedEmpty(press);
    if (press.kind === 'place') this.clickedCurve(press);
    this.batching = false;
    this.commit(press.undo, pressName(press));
    this.use(controlUsed(press));
  }

  /** Abort what the left button was doing (a second finger came down). */
  cancelPress() {
    const press = this.endPress();
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
    const hit = handle ? null : curveAt(this.chains, info);
    if (handle?.type === 'node') this.removeAll([handle.id]);
    else if (hit) this.removeSegment(hit.edge);
    else this.finishRoad();
  }
}

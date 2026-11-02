import { dragPress, emptyPress } from './press';
import {
  droppedNode,
  finishedGraph,
  extendTo,
  mergeInto,
  curvePress,
  placePress,
  removeNodesFrom,
  flipArmFrom,
  removeSegmentsFrom,
  splitAt,
} from './ops';
import { dropOf, snapBase, snapFor, snapPreview } from './snapping';
import { skeletonAnchors } from '../camera/skeletonAnchors';
import { cursorOf, mergePreview, targetOf } from './targets';
import { actionFor, type Action, type KeyMods } from './keymap';
import { Pins } from './pins.svelte';
import { Timeline, type Move } from './timeline.svelte';
import type { ControlId } from '../hints/hints';
import { pressName } from './stepNames';
import { controlUsed } from './usage';
import type { Pointer } from './proximity';
import { type Hover, type PointerInfo, type Press, type Snapshot } from './types';
import { curveAt, focusOf, handleAt, hoverAt } from './hits';
import {
  chainHandles,
  chainSegments,
  chainsOf,
  hitOfHandle,
  type RoadHandle,
  type RoadHit,
} from './chains';
import { moveOf } from './moves';
import { phaseOf } from './phase';
import { emptyGraph, nodeOf, roundToMm, sameGraph, type Graph } from '../model/graph';
import {
  afterEmptyClick,
  branchEdges,
  hoveredEdges,
  selectedSegments,
  sameSelection,
  afterHandleClick,
  type Band,
} from './selection';

export type { Hover, PointerInfo } from './types';

/**
 * The road editor: the graph, the road being drawn, selection and pointer interaction (^40, ^42).
 * No drawing and no view (zoom/pan) logic: the canvas component feeds it pointer events in world
 * coordinates (^12).
 *
 * Three modes (^48, ^54, ^120; `phase`): in select mode the left button edits handles, and a click on empty
 * canvas enters draw mode (it does not place a node yet). In draw mode it places nodes, the first
 * one starting a new road, inserts nodes on curves, and still edits handles.
 */
export class Editor {
  graph = $state.raw<Graph>(emptyGraph());
  mode = $state<'select' | 'draw'>('select');
  /** View mode (^104): nothing can be edited, only the camera works. Left with Tab. */
  viewing = $state(false);
  /** The node being drawn from, null in select mode or before the first node. */
  active = $state<number | null>(null);
  /** Which way the next edge runs from the node being drawn from (^65). */
  end = $state<Snapshot['end']>('end');
  /** The node the road being drawn started at (a click on it closes a loop, ^162). */
  origin = $state<number | null>(null);
  /** The last pointer position with its modifiers, to look at what is under it again when something changes without the pointer moving. */
  private lastInfo = $state.raw<PointerInfo | null>(null);
  /** Where the pointer is, for showing handles that are near it (^55). */
  pointer = $derived<Pointer | null>(
    this.lastInfo && { pt: this.lastInfo.pt, scale: this.lastInfo.scale },
  );
  /** The selected nodes (^70); the last one is `sel`. */
  selection = $state.raw<number[]>([]);
  /** The selection box while it is dragged, in screen pixels. */
  band = $state.raw<Band | null>(null);
  /**
   * What is under the pointer. Derived, not kept: from the last pointer position and the state of
   * the editor, so it is right whenever either changes, also when the pointer did not move (a
   * finished road, a placed node, an undo, a key, ^238). None while the left button is down.
   */

  private press = $state.raw<Press | null>(null);
  readonly timeline = new Timeline();

  private use(id: ControlId | null) {
    if (id) this.used = { seq: (this.used?.seq ?? 0) + 1, id };
  }
  /** The curve before and after a split on it: finishing at once goes back to the first (^237). */
  private splitUndo: { before: Graph; after: Graph } | null = null;
  /** The last control used that has a hint that is hidden once it is visited (^110). */
  used = $state.raw<{ seq: number; id: ControlId } | null>(null);
  /** True while the end of a press runs, so everything it does is one step. */
  private batching = false;

  /** The node last picked. */
  sel = $derived(this.selection.at(-1) ?? null);
  drawing = $derived(this.mode === 'draw');
  private hoverRaw = $derived<Hover | null>(this.hoverNow());
  readonly pins = new Pins((id) => nodeOf(this.graph, id) !== undefined);
  private base = $derived(snapBase(this.press ? this.press.undo.graph : this.graph, this.press));
  /** What the pointer is pulled to while it places or moves a node (^101): derived like the hover. */
  snapped = $derived(
    snapFor(this.base, {
      info: this.lastInfo,
      press: this.press,
      hover: this.hoverRaw,
      drawing: this.drawing,
      pinned: this.pins.list,
    }),
  );
  hover = $derived<Hover | null>(snapPreview(this.hoverRaw, this.snapped, () => this.snapshot()));
  /** The three modes (^120): extend mode is draw mode while a node is being extended. */
  phase = $derived(phaseOf(this.mode, this.active, this.viewing));
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
    if (action === 'view') this.toggleView();
    else if (this.viewing) return false;
    else if (action === 'escape') this.escape();
    else if (action === 'deleteNode') this.deleteSelected();
    else if (action === 'pin') this.pins.set(this.selection);
    else if (action) this.move(action);
    return action !== undefined;
  }

  /** Tab: to view mode from any mode (a road being drawn is finished), and back to select mode (^104). */
  private toggleView() {
    if (this.press) return;
    if (!this.viewing) this.finishRoad(true);
    this.viewing = !this.viewing;
    this.use('view');
  }

  /** Undo or redo a step (^81) or a whole batch (^103); not while the left button is down. */
  private move(action: Move) {
    const to = this.press ? null : this.timeline.go(action);
    if (!to) return;
    this.restore(to);
    this.use(action.startsWith('undo') ? 'undo' : 'redo');
  }

  private restore(s: Snapshot) {
    this.splitUndo = null;
    Object.assign(this, s);
    if (s.active !== null) this.mode = 'draw';
  }

  /** Make a step undoable if it changed the graph or the selection (^88), and round it to the millimeter (^170). Inside a press only its end commits. */
  private commit(before: Snapshot, name: string) {
    if (this.batching) return;
    this.graph = roundToMm(this.graph);
    // A graph with the same content stays the object it was (a drag back to where it began), so nothing else sees a change.
    if (sameGraph(before.graph, this.graph)) this.graph = before.graph;
    if (before.graph === this.graph && sameSelection(before.selection, this.selection)) return;
    this.timeline.record(before, this.snapshot(), name);
  }

  /** Replace everything by another map (a project was opened): no selection, no drawing, no history. */
  load(graph: Graph) {
    this.graph = graph;
    this.leaveDrawing(true);
    [this.press, this.band, this.lastInfo] = [null, null, null];
    this.timeline.clear();
  }

  deleteSelected() {
    if (this.selection.length) this.use('delete-selected');
    this.removeAll(this.selection);
  }

  private removeAll(ids: number[]) {
    if (!ids.length) return;
    const name = ids.length === 1 ? 'delete node' : `delete ${ids.length} nodes`;
    this.edit(name, (d) => removeNodesFrom(d, ids));
  }

  /** Remove a segment, or with Alt its whole branch (^160). */
  private removeSegments(edge: number, branch: boolean) {
    const ids = branch ? branchEdges(this.graph, edge) : [edge];
    this.edit(branch ? 'remove branch' : 'remove segment', (d) => removeSegmentsFrom(d, ids));
  }

  /** One undoable step: the editing function takes the state and gives the new one. */
  private edit(name: string, change: (d: Snapshot) => Snapshot) {
    const before = this.snapshot();
    this.restore(change(before));
    this.commit(before, name);
  }

  /** No road being drawn, nothing selected: draw mode again (^120), or select mode. */
  private leaveDrawing(toSelect: boolean) {
    [this.mode, this.viewing] = [toSelect ? 'select' : 'draw', false];
    [this.active, this.origin, this.end, this.selection] = [null, null, 'end', []];
  }

  /** Esc: finish the road being drawn, or with none deselect all (^218). */
  private escape() {
    if (this.mode === 'draw') return this.finishRoad(true);
    if (!this.selection.length) return;
    this.edit('deselect all', (d) => ({ ...d, selection: [] }));
    this.use('deselect-all');
  }

  /** Enter draw mode: the next click places the first node of a new road. */
  enterDrawMode() {
    this.mode = 'draw';
    this.selection = [];
  }

  /**
   * Finish the road being drawn (extend mode goes back to draw mode, ^120); with no road being drawn,
   * leave draw mode. `toSelect` (Esc) always leaves it. A road with fewer than two nodes is cancelled.
   */
  finishRoad(toSelect = false, keep = false) {
    if (this.mode === 'select') return;
    const before = this.snapshot();
    // A split on a curve that was finished at once gives the curve back (an inserted node would stay), unless the click was on the inserted node (^276).
    this.graph = finishedGraph(this.graph, keep ? null : this.splitUndo);
    this.leaveDrawing(toSelect || this.active === null);
    this.commit(before, 'finish road');
  }

  /** Left button pressed. */
  pointerDown(info: PointerInfo) {
    this.lastInfo = info;
    if (this.viewing) return;
    const handle = handleAt(this.handles(info.scale), info);
    if (handle) return this.grab(handle, info);
    const hit = curveAt(this.chains, info);
    if (!this.drawing) {
      this.press = emptyPress(this.snapshot(), info, hit);
      return;
    }
    this.begin(
      hit
        ? curvePress(this.snapshot(), hit)
        : placePress(this.snapshot(), this.snapped ? { ...info, pt: this.snapped.pt } : info),
    );
  }

  private grab(handle: RoadHandle, info: PointerInfo) {
    const r = dragPress(this.snapshot(), this.drawing, handle, info);
    this.selection = r.selection;
    const curve = this.drawing && handle.type === 'rad' ? hitOfHandle(this.chains, handle) : null;
    this.press = { ...r.press, curve };
  }

  /** The press begins: its first change (a node placed or inserted), and the press itself. */
  private begin({ drawn, press }: { drawn: Snapshot; press: Press }) {
    this.restore(drawn);
    this.press = press;
  }

  /** A click on a curve ends in a split or merge at the inserted node; a drag only inserts it (^133). */
  private clickedCurve(press: Extract<Press, { kind: 'place' }>) {
    if (press.moved || !press.then) return;
    if (press.then === 'split') {
      this.restore(splitAt(this.snapshot(), press.id));
      this.splitUndo = { before: press.undo.graph, after: this.graph };
    } else this.merge(press.id);
  }

  pointerMove(info: PointerInfo) {
    this.lastInfo = info;
    const moved = this.press && moveOf(this.snapshot(), this.press, info, this.snapped?.pt);
    if (moved) Object.assign(this, moved);
  }

  /** Alt or Shift went down or up: what is under the pointer can look different, such as the hovered branch (^99), though the pointer did not move. */
  modifiers({ alt, shift, ctrl }: { alt: boolean; shift: boolean; ctrl?: boolean }) {
    if (!this.lastInfo) return;
    this.lastInfo = { ...this.lastInfo, alt, shift, ctrl: ctrl ?? this.lastInfo.ctrl };
  }

  private hoverNow(): Hover | null {
    const info = this.lastInfo;
    if (this.press || !info || this.viewing) return null;
    const hits = { handles: this.handles(info.scale), chains: this.chains };
    return hoverAt(this.snapshot(), hits, info, this.drawing);
  }

  /** The view moved under a pointer that did not (zoom, pan, rotate): the same screen position is another place now. Not while the left button is down. */
  look(info: PointerInfo | null) {
    if (!this.press) this.lastInfo = info;
  }

  /** The segments whose two nodes are selected, as (chain, index) pairs (^133). */
  get selectedSegments() {
    return chainSegments(this.chains, selectedSegments(this.graph, this.selection));
  }

  /** The segments under the pointer that get an outline: the one, or with Alt held the whole branch (^99, ^128). */
  get hoverSegments() {
    return chainSegments(
      this.chains,
      hoveredEdges(this.graph, this.hover, this.lastInfo?.alt ?? false),
    );
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

  private clickedEmpty(press: Extract<Press, { kind: 'empty' }>) {
    const next = afterEmptyClick(this.selection, press);
    if (next) this.selection = next;
    else this.enterDrawMode();
  }

  /** A click (no drag) on a node: toggles it, or in draw mode finishes, extends, splits or merges the road (^23, ^65). */
  private clickedHandle(press: Extract<Press, { kind: 'drag' }>) {
    const id = press.id;
    this.selection = afterHandleClick(this.selection, press);
    if (press.flip) this.restore(flipArmFrom(this.snapshot(), id));
    else if (press.curve) this.clickedRadius(press.curve);
    else if (press.act === 'finish') this.finishRoad(false, true);
    else if (press.act === 'extend') this.edit('extend road', (d) => extendTo(d, id));
    else if (press.act === 'split') this.restore(splitAt(this.snapshot(), id));
    else if (press.act === 'merge' || press.act === 'close') this.merge(id);
  }

  /** A click on a radius point splits or merges there, as on the curve (^278). */
  private clickedRadius(hit: RoadHit) {
    const r = curvePress(this.snapshot(), hit);
    this.restore(r.drawn);
    this.clickedCurve(r.press);
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
    const drop = dropOf(this.graph, this.press, this.snapped);
    const press = this.endPress();
    if (!press) return;
    this.batching = true;
    if (drop && press.kind === 'drag') this.restore(droppedNode(this.snapshot(), press.id, drop));
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

  /** Right click without moving: removes the node under the pointer, else finishes the road. */
  rightClick(info: PointerInfo) {
    if (this.viewing) return;
    const handle = handleAt(this.handles(info.scale), info);
    const hit = handle ? null : curveAt(this.chains, info);
    if (handle?.type === 'node') this.removeAll([handle.id]);
    else if (hit) this.removeSegments(hit.edge, info.alt);
    else this.finishRoad();
  }
}

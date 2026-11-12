import { dragPress, emptyPress } from './press';
import * as ops from './ops';
import { derivedNodes } from './derived';
import { dropOf } from './drop';
import { placedAt, snapBase, snapFor, snapPreview } from './snapping';
import { pointsAround } from './nearby';
import { tipWays } from './ways';
import { skeletonAnchors } from '../camera/skeletonAnchors';
import { cursorOf, mergePreview, targetOf } from './targets';
import { actionFor, type Action, type KeyMods } from './keymap';
import { Pins } from './pins.svelte';
import { deleteRemoval, rightClickRemoval, underHover } from './removal';
import { Timeline, type Move } from './timeline.svelte';
import type { ControlId } from '../hints/hints';
import { pressName } from './stepNames';
import { controlUsed } from './usage';
import { pointerOf } from './proximity';
import { type Hover, type PointerInfo, type Press, type Snapshot } from './types';
import { focusOf, hoverAt } from './hits';
import { followTowers } from './towerHeading';
import { collapseStep } from './dissolve';
import { followParallels } from './followParallels';
import { chainHandles, chainsOf, hitOfHandle, type RoadHandle, type RoadHit } from './chains';
import { moveOf } from './moves';
import { hoveredSegmentsOf, movingGroupOf, selectedSegmentsOf } from './views';
import { phaseOf } from './phase';
import { onlyFirstNode } from '../model/junction';
import { withKeys, type Keys } from './modifiers';
import { emptyGraph, nodeOf, roundToMm, sameGraph, type Graph } from '../model/graph';
import { afterEmptyClick, sameSelection, afterHandleClick, type Band } from './selection';

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
  pointer = $derived(pointerOf(this.lastInfo));
  /** The selected nodes (^70); the last one is `sel`. */
  selection = $state.raw<number[]>([]);
  /** The selection box while it is dragged, in screen pixels. */
  band = $state.raw<Band | null>(null);
  /**
   * What is under the pointer. Derived, not kept: from the last pointer position and the state of
   * the editor, so it is right whenever either changes, also when the pointer did not move (a
   * finished road, a placed node, an undo, a key, ^238). None while the left button is down.
   */

  press = $state.raw<Press | null>(null);
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
  private base = $derived(
    snapBase(
      this.press ? this.press.undo.graph : this.graph,
      this.press,
      this.drawing ? this.active : null,
    ),
  );
  /** What the pointer is pulled to while it places or moves a node (^101): derived like the hover. */
  private snapArgs = $derived({
    info: this.lastInfo,
    press: this.press,
    hover: this.hoverRaw,
    drawing: this.drawing,
    pinned: this.active === null ? this.pins.list : [...this.pins.list, this.active],
  });
  snapped = $derived(snapFor(this.base, this.snapArgs));
  /** The snap points near the pointer, shown while it places or moves a node (^890). */
  nearbyPoints = $derived(pointsAround(this.base, this.snapArgs, this.snapped));
  hover = $derived<Hover | null>(
    snapPreview(this.hoverRaw, this.snapped, () => ({
      info: this.lastInfo,
      drawn: this.snapshot(),
      chains: this.chains,
    })),
  );
  /** The three modes (^120): extend mode is draw mode while a node is being extended. */
  phase = $derived(phaseOf(this.mode, this.active, this.viewing));
  /** The chains of the graph, the shape the curve code and the drawing work on (^106). */
  chains = $derived(chainsOf(this.graph));
  edges = $derived(this.chains.map((c) => c.edges));
  /** The derived nodes of the graph (^822, ^823), never stored. */
  derived = $derived(derivedNodes(this.graph));
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
    else if (action === 'collapse') this.collapseSelected();
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
    this.graph = followParallels(before.graph, followTowers(before.graph, roundToMm(this.graph)));
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

  canCollapse = () => collapseStep(this.snapshot()).graph !== this.graph;
  /** Collapse the selected nodes without an effect (^1064), in one step; `canCollapse`: is there one. */
  collapseSelected() {
    if (this.selection.length) this.use('collapse-selected');
    this.edit('collapse nodes', collapseStep);
  }

  deleteSelected() {
    if (this.selection.length) this.use('delete-selected');
    const r = deleteRemoval(this.graph, this.selection, this.mode === 'select' ? this.hover : null);
    if (r) this.edit(r.name, r.change);
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
    this.splitUndo = null;
  }

  /** Esc: cancel a drag (^295); else finish the road being drawn, or with none deselect all (^218). */
  private escape() {
    if (this.press && this.press.kind !== 'empty') return this.cancelPress();
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
    this.graph = ops.finishedGraph(this.graph, keep ? null : this.splitUndo);
    this.leaveDrawing(toSelect || this.active === null);
    this.commit(before, onlyFirstNode(before) ? 'cancel first node' : 'finish road');
  }

  /** Left button pressed. */
  pointerDown(info: PointerInfo) {
    this.lastInfo = info;
    if (this.viewing) return;
    const h = this.hover;
    if (h?.kind === 'handle') return this.grab(h.handle, info);
    if (h?.kind !== 'candidate') return this.pressOn(null, info);
    if (h.derived) return this.realize(h.hit, info);
    this.pressOn(h.hit, info);
  }

  /** A press on a curve, or on the void when `hit` is null: select mode starts a click or a box, draw mode places or inserts a node. */
  private pressOn(hit: RoadHit | null, info: PointerInfo) {
    if (!this.drawing) {
      this.press = emptyPress(this.snapshot(), info, hit);
      return;
    }
    const place = () =>
      ops.placePress(this.snapshot(), placedAt(this.snapped, info, tipWays(this.snapshot())));
    this.begin(hit ? ops.curvePress(this.snapshot(), hit) : place());
  }

  /**
   * The left button went down on a derived node (^824): it becomes a real node (the segment is split
   * there, its curve does not change) and is dragged like any node. Without a move it is taken back
   * when the button is released.
   */
  private realize(hit: RoadHit, info: PointerInfo) {
    const before = this.snapshot();
    const made = ops.insertAt(before, hit);
    this.restore(made.drawn);
    const handle = this.handles(info.scale).find((h) => h.type === 'node' && h.id === made.id);
    if (handle) this.grab(handle, info);
    if (this.press?.kind === 'drag') this.press = { ...this.press, undo: before, realized: true };
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
      this.restore(ops.splitAt(this.snapshot(), press.id));
      this.splitUndo = { before: press.undo.graph, after: this.graph };
    } else this.merge(press.id);
  }

  pointerMove(info: PointerInfo) {
    this.lastInfo = info;
    const moved = this.press && moveOf(this.snapshot(), this.press, info, this.snapped);
    if (moved) Object.assign(this, moved);
  }

  /** Alt, Shift or Ctrl went down or up: what is under the pointer can look different (^99); a press goes on with the new keys, also with no move (^801). */
  modifiers(keys: Keys) {
    const { info, changed } = withKeys(this.lastInfo, keys);
    this.lastInfo = info;
    if (changed && info && this.press) this.pointerMove(info);
  }

  private hoverNow(): Hover | null {
    const info = this.lastInfo;
    if (this.press || !info || this.viewing) return null;
    const hits = { handles: this.handles(info.scale), chains: this.chains, derived: this.derived };
    return hoverAt(this.snapshot(), hits, info, this.drawing);
  }

  /** The view moved under a pointer that did not (zoom, pan, rotate): the same screen position is another place now. Not while the left button is down. */
  look(info: PointerInfo | null) {
    if (!this.press) this.lastInfo = info;
  }

  /** The segments whose two nodes are selected, as (chain, index) pairs (^133). */
  selectedSegments = $derived(selectedSegmentsOf(this.chains, this.graph, this.selection));
  /** The segments under the pointer that get an outline: the one, or with Alt held the whole branch (^99, ^128). */
  hoverSegments = $derived(
    hoveredSegmentsOf(this.chains, this.graph, this.hover, this.lastInfo?.alt ?? false),
  );
  /** The curve a merge into the node or curve under the pointer would add (^123, ^125). */
  mergePreview = $derived(mergePreview(this.snapshot(), this.hover));
  /** Moving several nodes hides all scaffolds meanwhile (^78). */
  movingGroup = $derived(movingGroupOf(this.press));

  private clickedEmpty(press: Extract<Press, { kind: 'empty' }>) {
    const next = afterEmptyClick(this.selection, press);
    if (next) this.selection = next;
    else this.enterDrawMode();
  }

  /** A click (no drag) on a node: toggles it, or in draw mode finishes, extends, splits or merges the road (^23, ^65). */
  private clickedHandle(press: Extract<Press, { kind: 'drag' }>) {
    const id = press.id;
    this.selection = afterHandleClick(this.selection, press);
    if (press.flip) this.restore(ops.flipArmFrom(this.snapshot(), id));
    else if (press.curve) this.clickedRadius(press.curve);
    else if (press.act === 'finish' || press.act === 'cancel') this.finishRoad(false, true);
    else if (press.act === 'extend')
      this.edit('extend road', (d) => ops.extendTo(d, id, press.reverse));
    else if (press.act === 'split') this.restore(ops.splitAt(this.snapshot(), id));
    else if (press.act === 'merge' || press.act === 'close') this.merge(id);
  }

  /** A click on a radius point splits or merges there, as on the curve (^278). */
  private clickedRadius(hit: RoadHit) {
    const r = ops.curvePress(this.snapshot(), hit);
    this.restore(r.drawn);
    this.clickedCurve(r.press);
  }

  private merge(id: number) {
    this.restore(ops.mergeInto(this.snapshot(), id));
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
    if (press.kind === 'drag') this.endDrag(press, drop);
    if (press.kind === 'empty' && !press.moved) this.clickedEmpty(press);
    if (press.kind === 'place') this.clickedCurve(press);
    this.batching = false;
    this.commit(press.undo, pressName(press));
    this.use(controlUsed(press));
  }

  /** A node dropped on a node or a curve merges; a click without moving is a click on the handle, or takes a realized node back (^824). */
  private endDrag(press: Extract<Press, { kind: 'drag' }>, drop: ReturnType<typeof dropOf>) {
    if (drop) this.restore(ops.droppedNode(this.snapshot(), press.id, drop));
    if (press.moved) return;
    if (press.realized) this.restore(press.undo);
    else this.clickedHandle(press);
  }

  /** Abort what the left button was doing (a second finger came down, or Esc, ^295). */
  cancelPress() {
    const press = this.endPress();
    if (!press || press.kind === 'empty') return;
    this.restore(press.undo);
  }

  /** Right click without moving: removes what is under the pointer (what the hint says: the hover, snapped like a left click), else finishes the road (^43, ^160, ^290, ^808). */
  rightClick(info: PointerInfo) {
    if (this.viewing) return;
    this.lastInfo = info;
    const r = rightClickRemoval(this.graph, this.selection, underHover(this.hover), info.alt);
    if (r) this.edit(r.name, r.change);
    else this.finishRoad();
  }
}

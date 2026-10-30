import { applyDrag, dragHeading, resetRadius } from './curves/drag';
import { hitHandle } from './curves/handles';
import { appendNode, insertNode, prependNode } from './curves/path';
import {
  edgesOfRoads,
  nearestOnRoads,
  moveNodes,
  shareRadius,
  removeNodesFrom,
  removeRoad,
  replaceRoad,
  roadHandles,
  startRoad,
  type NodeRef,
  type RoadHandle,
  type RoadHit,
  type Roads,
} from './curves/roads';
import { dist, type Vec } from './curves/vec';
import { dragPress, emptyPress } from './editorPress';
import { skeletonAnchors } from './skeletonAnchors';
import type { Focus } from './focus';
import { cursorOf, extendTo, isActiveEnd, previewOf, targetOf, type Drawn } from './editorTargets';
import { KEYMAP, type Action } from './keymap';
import type { Pointer } from './proximity';
import {
  DRAG_PX,
  INSERT_REACH_PX,
  type Hover,
  type PointerInfo,
  type Press,
  type Snapshot,
} from './editorTypes';
import {
  afterCurveClick,
  nodesInBand,
  selectedSegments,
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

  sel = $derived(this.selection.at(-1) ?? null);
  drawing = $derived(this.mode === 'draw');
  edges = $derived(edgesOfRoads(this.roads));
  /** The skeleton of all roads, for the camera bounds (^37, ^62). */
  anchors = $derived(skeletonAnchors(this.roads, this.edges));
  cursor = $derived(cursorOf(this.hover, this.drawing));
  /** The handle being hovered or dragged, or the node being placed (reveals its gizmos, ^51). */
  focus = $derived(this.currentFocus());
  /** What the control hints are about (^49). */
  hintTarget = $derived(this.press?.target ?? targetOf(this.drawn, this.hover));

  private currentFocus(): Focus | null {
    const press = this.press;
    if (press?.kind === 'drag') {
      return { road: press.road, type: press.drag.handle.type, i: press.drag.handle.i };
    }
    if (press?.kind === 'place') return { road: press.ref.road, type: 'node', i: press.ref.node };
    const h = this.hover?.kind === 'handle' ? this.hover.handle : null;
    return h ? { road: h.road, type: h.type, i: h.i } : null;
  }

  private get drawn(): Drawn {
    return { roads: this.roads, active: this.active, end: this.end, selection: this.selection };
  }

  private isActiveEnd(handle: RoadHandle) {
    return isActiveEnd(this.drawn, handle);
  }

  handles(scale: number): RoadHandle[] {
    return roadHandles(this.roads, this.edges, scale);
  }

  private snapshot(): Snapshot {
    return { roads: this.roads, active: this.active, end: this.end, selection: this.selection };
  }

  private handleAt({ pt, scale, touch }: PointerInfo): RoadHandle | null {
    return hitHandle(this.handles(scale), pt, scale, touch);
  }

  private curveAt({ pt, scale }: PointerInfo): RoadHit | null {
    return nearestOnRoads(this.roads, pt, INSERT_REACH_PX / scale);
  }

  /** Handle a key; true if it was bound. */
  key(key: string): boolean {
    const action: Action | undefined = KEYMAP[key];
    if (action === 'finishRoad') this.finishRoad();
    else if (action === 'deleteNode') this.deleteSelected();
    return action !== undefined;
  }

  deleteSelected() {
    this.removeAll(this.selection);
  }

  private removeAll(refs: NodeRef[]) {
    if (!refs.length) return;
    const r = removeNodesFrom(this.roads, refs, this.active);
    this.roads = r.roads;
    this.active = r.active;
    if (r.active === null) this.end = 'end';
    this.selection = [];
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
    const cancel = road !== null && (this.roads[road]?.nodes.length ?? 0) < 2;
    if (road !== null && cancel) this.roads = removeRoad(this.roads, road, road).roads;
    this.mode = 'select';
    this.active = null;
    this.end = 'end';
    this.selection = [];
  }

  /** Left button pressed. */
  pointerDown(info: PointerInfo) {
    this.hover = null;
    this.pointer = { pt: info.pt, scale: info.scale };
    const handle = this.handleAt(info);
    if (handle) return this.grab(handle, info);
    if (!this.drawing) {
      this.press = emptyPress(this.drawn, info, this.curveAt(info));
      return;
    }
    const hit = this.curveAt(info);
    if (hit) this.insert(hit);
    else this.create(info.pt);
  }

  private grab(handle: RoadHandle, info: PointerInfo) {
    const r = dragPress(this.drawn, this.drawing, handle, info);
    this.selection = r.selection;
    this.press = r.press;
  }

  private insert(hit: RoadHit) {
    const undo = this.snapshot();
    const r = insertNode(this.roads[hit.road]!, hit);
    this.roads = replaceRoad(this.roads, hit.road, r.path);
    const ref = { road: hit.road, node: r.sel };
    this.selection = [ref];
    this.press = { kind: 'place', ref, undo, target: { kind: 'curve' } };
  }

  /** A node at the end of the road being drawn, or the first node of a new road (enters draw mode). */
  private create(pt: Vec) {
    const undo = this.snapshot();
    if (this.active === null) {
      const r = startRoad(this.roads, pt);
      this.roads = r.roads;
      this.active = r.road;
      this.selection = [{ road: r.road, node: 0 }];
    } else {
      const add = this.end === 'end' ? appendNode : prependNode;
      const r = add(this.roads[this.active]!, pt);
      this.roads = replaceRoad(this.roads, this.active, r.path);
      this.selection = [{ road: this.active, node: r.sel }];
    }
    this.press = { kind: 'place', ref: this.selection[0]!, undo, target: { kind: 'empty' } };
  }

  pointerMove(info: PointerInfo) {
    this.pointer = { pt: info.pt, scale: info.scale };
    const press = this.press;
    if (!press) this.hover = this.hoverAt(info);
    else if (press.kind === 'drag') this.moveDrag(press, info);
    else if (press.kind === 'place') this.placeHeading(press.ref, info);
    else this.moveBand(press, info);
  }

  private moveDrag(press: Extract<Press, { kind: 'drag' }>, info: PointerInfo) {
    if (!press.moved && dist(info.pt, press.start) <= DRAG_PX / info.scale) return;
    press.moved = true;
    const road = press.road;
    const path = applyDrag(this.roads[road]!, press.drag, info.pt, { snap: info.shift });
    const moved = this.shared(replaceRoad(this.roads, road, path), press);
    const to = path.nodes[press.drag.handle.i]!;
    const delta = { x: to.x - press.origin.x, y: to.y - press.origin.y };
    const group = press.drag.handle.type === 'node' ? press.group : [];
    this.roads = group.length ? moveNodes(moved, group, delta) : moved;
  }

  /** Dragging the radius of a selected segment sets the radius of all selected segments (^77). */
  private shared(roads: Roads, press: Extract<Press, { kind: 'drag' }>): Roads {
    const own = this.sharing(press);
    return own ? shareRadius(roads, own[0], own[1]) : roads;
  }

  /** The dragged segment and all selected segments, while a radius is dragged between selected nodes. */
  private sharing(press: Press | null) {
    if (press?.kind !== 'drag' || press.drag.handle.type !== 'rad') return null;
    const own = { road: press.road, i: press.drag.handle.i };
    const all = selectedSegments(this.roads, this.selection);
    return all.some((s) => s.road === own.road && s.i === own.i) ? ([own, all] as const) : null;
  }

  /** Segments whose scaffold shows besides the focused one: the selected ones while sharing a radius (^77). */
  get extraScaffold() {
    return this.sharing(this.press)?.[1] ?? [];
  }

  /** Moving several nodes hides all scaffolds meanwhile (^78). */
  get movingGroup() {
    const press = this.press;
    return press?.kind === 'drag' && press.moved && press.group.length > 0;
  }

  /** Dragging on empty canvas spans the selection box; shift keeps the selection and adds to it (^70, ^72). */
  private moveBand(press: Extract<Press, { kind: 'empty' }>, info: PointerInfo) {
    if (!press.moved && dist(info.screen, press.screen) <= DRAG_PX) return;
    press.moved = true;
    this.band = { a: press.screen, b: info.screen };
    const inside = nodesInBand(this.roads, this.band, info.project);
    this.selection = withNodes(press.base, inside);
  }

  /** Dragging while a node is placed sets its heading, from where it was placed (^40). */
  private placeHeading(ref: NodeRef, info: PointerInfo) {
    const path = this.roads[ref.road]!;
    const at = path.nodes[ref.node]!;
    if (dist(info.pt, at) < DRAG_PX / info.scale) return;
    this.roads = replaceRoad(
      this.roads,
      ref.road,
      dragHeading(path, ref.node, info.pt, info.shift),
    );
  }

  private hoverAt(info: PointerInfo): Hover | null {
    const handle = this.handleAt(info);
    if (handle) return { kind: 'handle', handle };
    const hit = this.curveAt(info);
    if (hit) return { kind: 'candidate', hit };
    return this.drawing ? previewOf(this.drawn, info.pt) : null;
  }

  private clickedEmpty(press: Extract<Press, { kind: 'empty' }>) {
    const { curve, shift } = press;
    if (curve.length) this.selection = afterCurveClick(this.selection, curve, shift);
    else if (shift) return;
    else if (this.selection.length) this.selection = [];
    else this.enterDrawMode();
  }

  private extendFrom(ref: NodeRef) {
    const d = extendTo(this.drawn, ref);
    [this.roads, this.active, this.end, this.selection] = [d.roads, d.active, d.end, d.selection];
  }

  /** A click (no drag) on the node being drawn from finishes the road; on another leaf node it extends the road from there. */
  private clickedHandle(press: Extract<Press, { kind: 'drag' }>) {
    const ref = { road: press.road, node: press.drag.handle.i };
    if (press.click === 'toggle') this.selection = withoutNode(this.selection, ref);
    else if (press.click === 'collapse' && press.group.length && !press.extend)
      this.selection = [ref];
    if (press.finishes) this.finishRoad();
    else if (press.extend) this.extendFrom({ road: press.road, node: press.drag.handle.i });
  }

  /** Left button released. */
  pointerUp() {
    const press = this.press;
    this.press = null;
    this.band = null;
    if (press?.kind === 'drag' && !press.moved) this.clickedHandle(press);
    if (press?.kind === 'empty' && !press.moved) this.clickedEmpty(press);
  }

  /** Abort what the left button was doing (a second finger came down). */
  cancelPress() {
    const press = this.press;
    this.press = null;
    this.band = null;
    if (!press || press.kind === 'empty') return;
    const { roads, active, end, selection } = press.undo;
    this.roads = roads;
    this.active = active;
    this.end = end;
    this.selection = selection;
  }

  pointerLeave() {
    if (this.press) return;
    this.hover = null;
    this.pointer = null;
  }

  /** Right click without moving: removes the node under the pointer, else finishes the road. */
  rightClick(info: PointerInfo) {
    const handle = this.handleAt(info);
    if (handle?.type === 'node') this.removeAll([{ road: handle.road, node: handle.i }]);
    else this.finishRoad();
  }

  /** Double-click on a radius ring resets the radius to auto (^8). */
  resetRadiusAt(info: PointerInfo) {
    const handle = this.handleAt(info);
    if (handle?.type !== 'rad') return;
    const path = this.roads[handle.road]!;
    this.roads = replaceRoad(this.roads, handle.road, resetRadius(path, handle.i));
  }
}

import { applyDrag, dragHeading, resetRadius, startDrag, type DragState } from './curves/drag';
import { hitHandle } from './curves/handles';
import { appendNode, autoHeading, autoHeadingBefore, insertNode, prependNode } from './curves/path';
import type { PathNode } from './curves/types';
import {
  edgesOfRoads,
  nearestOnRoads,
  removeNodeFrom,
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
import { skeletonAnchors } from './skeletonAnchors';
import type { Focus } from './focus';
import type { HintTarget } from './hints';
import { KEYMAP, type Action } from './keymap';
import type { Pointer } from './proximity';

/** What the pointer is doing, as seen by the editor. Positions are world meters. */
export interface PointerInfo {
  pt: Vec;
  /** Pixels per meter, for screen-sized hit areas. */
  scale: number;
  touch: boolean;
  shift: boolean;
}

/**
 * What is under the pointer: a handle to edit, and in draw mode also a curve to insert into or
 * the preview of the node a click would add (^48).
 */
export type Hover =
  | { kind: 'handle'; handle: RoadHandle }
  | { kind: 'candidate'; hit: RoadHit }
  | { kind: 'preview'; node: PathNode; ref: PathNode | null; end: 'start' | 'end' };

/** Distance in screen pixels within which a press snaps to a curve. */
const INSERT_REACH_PX = 18;
/** Pointer travel (screen pixels) that turns a press into a drag. */
const DRAG_PX = 6;

interface Snapshot {
  roads: Roads;
  active: number | null;
  end: 'start' | 'end';
  sel: NodeRef | null;
}

/**
 * The left button is down: dragging a handle, placing a node (its heading by dragging), or, in
 * select mode on empty canvas, a click that enters draw mode (a drag there is reserved for a
 * rubber band selection, later).
 */
type Press =
  | {
      kind: 'drag';
      road: number;
      drag: DragState;
      start: Vec;
      moved: boolean;
      /** A click finishes the road (it is the end being drawn) or extends it from another leaf node. */
      finishes: boolean;
      extend: boolean;
      undo: Snapshot;
      target: HintTarget;
    }
  | { kind: 'place'; ref: NodeRef; undo: Snapshot; target: HintTarget }
  | { kind: 'empty'; start: Vec; moved: boolean; target: HintTarget };

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
  sel = $state.raw<NodeRef | null>(null);
  hover = $state.raw<Hover | null>(null);
  private press = $state.raw<Press | null>(null);

  drawing = $derived(this.mode === 'draw');
  edges = $derived(edgesOfRoads(this.roads));
  /** The skeleton of all roads, for the camera bounds (^37, ^62). */
  anchors = $derived(skeletonAnchors(this.roads, this.edges));
  cursor = $derived(this.pointerCursor());
  /** The handle being hovered or dragged, or the node being placed (reveals its gizmos, ^51). */
  focus = $derived(this.currentFocus());
  /** What the control hints are about (^49). */
  hintTarget = $derived(this.press?.target ?? this.targetOf(this.hover));

  private pointerCursor(): string {
    if (this.hover?.kind === 'handle') return 'grab';
    if (this.hover?.kind === 'candidate') return 'copy';
    return this.drawing ? 'crosshair' : 'default';
  }

  private currentFocus(): Focus | null {
    const press = this.press;
    if (press?.kind === 'drag') {
      return { road: press.road, type: press.drag.handle.type, i: press.drag.handle.i };
    }
    if (press?.kind === 'place') return { road: press.ref.road, type: 'node', i: press.ref.node };
    const h = this.hover?.kind === 'handle' ? this.hover.handle : null;
    return h ? { road: h.road, type: h.type, i: h.i } : null;
  }

  /** The node of the road being drawn that new nodes attach to (clicking it finishes the road). */
  private isActiveEnd(handle: RoadHandle): boolean {
    const nodes = this.roads[handle.road]?.nodes ?? [];
    if (handle.type !== 'node' || handle.road !== this.active) return false;
    return nodes.length === 1 || handle.i === (this.end === 'end' ? nodes.length - 1 : 0);
  }

  /** A node at either end of its road: drawing can extend the road from it (^65). */
  private isLeaf(handle: RoadHandle): boolean {
    const nodes = this.roads[handle.road]?.nodes ?? [];
    return handle.type === 'node' && (handle.i === 0 || handle.i === nodes.length - 1);
  }

  private targetOf(hover: Hover | null): HintTarget {
    if (hover?.kind === 'handle') {
      const { handle } = hover;
      return {
        kind: 'handle',
        type: handle.type,
        last: this.isActiveEnd(handle),
        leaf: this.isLeaf(handle),
      };
    }
    return hover?.kind === 'candidate' ? { kind: 'curve' } : { kind: 'empty' };
  }

  handles(scale: number): RoadHandle[] {
    return roadHandles(this.roads, this.edges, scale);
  }

  private snapshot(): Snapshot {
    return { roads: this.roads, active: this.active, end: this.end, sel: this.sel };
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
    if (this.sel) this.removeAt(this.sel);
  }

  private removeAt(ref: NodeRef) {
    const r = removeNodeFrom(this.roads, ref, this.active);
    this.roads = r.roads;
    this.active = r.active;
    if (r.active === null) this.end = 'end';
    this.sel = null;
  }

  /** Enter draw mode: the next click places the first node of a new road. */
  enterDrawMode() {
    this.mode = 'draw';
    this.sel = null;
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
    this.sel = null;
  }

  /** Left button pressed. */
  pointerDown(info: PointerInfo) {
    this.hover = null;
    this.pointer = { pt: info.pt, scale: info.scale };
    const handle = this.handleAt(info);
    if (handle) return this.grab(handle, info);
    if (!this.drawing) {
      this.press = { kind: 'empty', start: info.pt, moved: false, target: { kind: 'empty' } };
      return;
    }
    const hit = this.curveAt(info);
    if (hit) this.insert(hit);
    else this.create(info.pt);
  }

  private grab(handle: RoadHandle, { pt }: PointerInfo) {
    const path = this.roads[handle.road]!;
    if (handle.type === 'node' || handle.type === 'head') {
      this.sel = { road: handle.road, node: handle.i };
    }
    this.press = {
      kind: 'drag',
      road: handle.road,
      drag: startDrag(path, handle),
      start: pt,
      moved: false,
      finishes: this.isActiveEnd(handle),
      extend: this.drawing && this.isLeaf(handle) && !this.isActiveEnd(handle),
      undo: this.snapshot(),
      target: this.targetOf({ kind: 'handle', handle }),
    };
  }

  private insert(hit: RoadHit) {
    const undo = this.snapshot();
    const r = insertNode(this.roads[hit.road]!, hit);
    this.roads = replaceRoad(this.roads, hit.road, r.path);
    this.sel = { road: hit.road, node: r.sel };
    this.press = { kind: 'place', ref: this.sel, undo, target: { kind: 'curve' } };
  }

  /** A node at the end of the road being drawn, or the first node of a new road (enters draw mode). */
  private create(pt: Vec) {
    const undo = this.snapshot();
    if (this.active === null) {
      const r = startRoad(this.roads, pt);
      this.roads = r.roads;
      this.active = r.road;
      this.sel = { road: r.road, node: 0 };
    } else {
      const add = this.end === 'end' ? appendNode : prependNode;
      const r = add(this.roads[this.active]!, pt);
      this.roads = replaceRoad(this.roads, this.active, r.path);
      this.sel = { road: this.active, node: r.sel };
    }
    this.press = { kind: 'place', ref: this.sel, undo, target: { kind: 'empty' } };
  }

  pointerMove(info: PointerInfo) {
    this.pointer = { pt: info.pt, scale: info.scale };
    const press = this.press;
    if (!press) this.hover = this.hoverAt(info);
    else if (press.kind === 'drag') this.moveDrag(press, info);
    else if (press.kind === 'place') this.placeHeading(press.ref, info);
    else if (dist(info.pt, press.start) > DRAG_PX / info.scale) press.moved = true;
  }

  private moveDrag(press: Extract<Press, { kind: 'drag' }>, info: PointerInfo) {
    if (!press.moved && dist(info.pt, press.start) <= DRAG_PX / info.scale) return;
    press.moved = true;
    const road = press.road;
    const path = applyDrag(this.roads[road]!, press.drag, info.pt, { snap: info.shift });
    this.roads = replaceRoad(this.roads, road, path);
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
    if (!this.drawing) return null;
    const hit = this.curveAt(info);
    return hit ? { kind: 'candidate', hit } : this.previewAt(info.pt);
  }

  /** The preview of the node a click would add: where, its heading, and the node it attaches to. */
  private previewAt(pt: Vec): Hover {
    const nodes = this.active === null ? undefined : this.roads[this.active]?.nodes;
    const ref = (this.end === 'end' ? nodes?.[nodes.length - 1] : nodes?.[0]) ?? null;
    const heading = this.end === 'end' ? autoHeading : autoHeadingBefore;
    return {
      kind: 'preview',
      ref,
      end: this.end,
      node: { x: pt.x, y: pt.y, th: ref ? heading(ref, pt) : 0 },
    };
  }

  /** A click (no drag) on the node being drawn from finishes the road; on another leaf node it extends the road from there. */
  private clickedHandle(press: Extract<Press, { kind: 'drag' }>) {
    if (press.finishes) this.finishRoad();
    else if (press.extend) this.extendFrom({ road: press.road, node: press.drag.handle.i });
  }

  /**
   * Make a leaf node the one the next node attaches to (^65): the road it belongs to becomes the
   * road being drawn, at that end. A road being drawn with one node only is dropped, since a road
   * needs two.
   */
  private extendFrom(ref: NodeRef) {
    const road = this.dropLoneRoad(ref.road);
    const nodes = this.roads[road]?.nodes ?? [];
    this.active = road;
    this.end = ref.node === 0 && nodes.length > 1 ? 'start' : 'end';
    this.sel = { road, node: ref.node };
  }

  /** Remove the road being drawn if it has one node only and is not `keep`; returns keep's new index. */
  private dropLoneRoad(keep: number): number {
    const prev = this.active;
    if (prev === null || prev === keep || (this.roads[prev]?.nodes.length ?? 0) >= 2) return keep;
    this.roads = removeRoad(this.roads, prev, prev).roads;
    return prev < keep ? keep - 1 : keep;
  }

  /** Left button released. */
  pointerUp() {
    const press = this.press;
    this.press = null;
    if (press?.kind === 'drag' && !press.moved) this.clickedHandle(press);
    if (press?.kind === 'empty' && !press.moved) this.enterDrawMode();
  }

  /** Abort what the left button was doing (a second finger came down). */
  cancelPress() {
    const press = this.press;
    this.press = null;
    if (!press || press.kind === 'empty') return;
    const { roads, active, end, sel } = press.undo;
    this.roads = roads;
    this.active = active;
    this.end = end;
    this.sel = sel;
  }

  pointerLeave() {
    if (this.press) return;
    this.hover = null;
    this.pointer = null;
  }

  /** Right click without moving: removes the node under the pointer, else finishes the road. */
  rightClick(info: PointerInfo) {
    const handle = this.handleAt(info);
    if (handle?.type === 'node') this.removeAt({ road: handle.road, node: handle.i });
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

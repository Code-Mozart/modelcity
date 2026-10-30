import { applyDrag, dragHeading, resetRadius, startDrag, type DragState } from './curves/drag';
import { hitHandle } from './curves/handles';
import { appendNode, autoHeading, insertNode } from './curves/path';
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
import { contentAnchors } from './contentAnchors';
import type { Focus } from './focus';
import type { HintTarget } from './hints';
import { KEYMAP, type Action } from './keymap';

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
  | { kind: 'ghost'; node: PathNode; ref: PathNode | null };

/** Distance in screen pixels within which a press snaps to a curve. */
const INSERT_REACH_PX = 18;
/** Pointer travel (screen pixels) that turns a press into a drag. */
const DRAG_PX = 6;

interface Snapshot {
  roads: Roads;
  active: number | null;
  sel: NodeRef | null;
}

/** The left button is down: either dragging a handle, or placing a node (its heading by dragging). */
type Press =
  | {
      kind: 'drag';
      road: number;
      drag: DragState;
      start: Vec;
      moved: boolean;
      finishes: boolean;
      undo: Snapshot;
      target: HintTarget;
    }
  | { kind: 'place'; ref: NodeRef; undo: Snapshot; target: HintTarget };

/**
 * The road editor: roads, the road being drawn, selection and pointer interaction (^40, ^42). No
 * drawing and no view (zoom/pan) logic: the canvas component feeds it pointer events in world
 * coordinates (^12).
 *
 * Two modes (^48): in select mode (no road being drawn) the left button edits handles, and a
 * press on empty canvas starts a road and enters draw mode. In draw mode it adds nodes to the
 * road, inserts nodes on curves, and still edits handles.
 */
export class Editor {
  roads = $state.raw<Roads>([]);
  /** Index of the road being drawn, null in select mode. */
  active = $state<number | null>(null);
  sel = $state.raw<NodeRef | null>(null);
  hover = $state.raw<Hover | null>(null);
  private press = $state.raw<Press | null>(null);

  drawing = $derived(this.active !== null);
  edges = $derived(edgesOfRoads(this.roads));
  /** Everything the user can grab, for the camera bounds (^37). */
  anchors = $derived(contentAnchors(this.roads, this.edges));
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

  private isLastNode(handle: RoadHandle): boolean {
    const nodes = this.roads[handle.road]?.nodes ?? [];
    return handle.type === 'node' && handle.road === this.active && handle.i === nodes.length - 1;
  }

  private targetOf(hover: Hover | null): HintTarget {
    if (hover?.kind === 'handle') {
      return { kind: 'handle', type: hover.handle.type, last: this.isLastNode(hover.handle) };
    }
    return hover?.kind === 'candidate' ? { kind: 'curve' } : { kind: 'empty' };
  }

  handles(scale: number): RoadHandle[] {
    return roadHandles(this.roads, this.edges, scale);
  }

  private snapshot(): Snapshot {
    return { roads: this.roads, active: this.active, sel: this.sel };
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
    this.sel = null;
  }

  /** Leave draw mode; a road with fewer than two nodes is cancelled. */
  finishRoad() {
    const road = this.active;
    if (road === null) return;
    const cancel = (this.roads[road]?.nodes.length ?? 0) < 2;
    if (cancel) this.roads = removeRoad(this.roads, road, road).roads;
    this.active = null;
    this.sel = null;
  }

  /** Left button pressed. */
  pointerDown(info: PointerInfo) {
    this.hover = null;
    const handle = this.handleAt(info);
    if (handle) return this.grab(handle, info);
    const hit = this.drawing ? this.curveAt(info) : null;
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
      finishes: this.isLastNode(handle),
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
      const r = appendNode(this.roads[this.active]!, pt);
      this.roads = replaceRoad(this.roads, this.active, r.path);
      this.sel = { road: this.active, node: r.sel };
    }
    this.press = { kind: 'place', ref: this.sel, undo, target: { kind: 'empty' } };
  }

  pointerMove(info: PointerInfo) {
    const press = this.press;
    if (!press) this.hover = this.hoverAt(info);
    else if (press.kind === 'drag') this.moveDrag(press, info);
    else this.placeHeading(press.ref, info);
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
    if (hit) return { kind: 'candidate', hit };
    const nodes = this.roads[this.active!]?.nodes;
    const ref = nodes?.[nodes.length - 1] ?? null;
    const th = ref ? autoHeading(ref, info.pt) : 0;
    return { kind: 'ghost', ref, node: { x: info.pt.x, y: info.pt.y, th } };
  }

  /** Left button released; clicking the last node of the road being drawn finishes it. */
  pointerUp() {
    const press = this.press;
    this.press = null;
    if (press?.kind === 'drag' && press.finishes && !press.moved) this.finishRoad();
  }

  /** Abort what the left button was doing (a second finger came down). */
  cancelPress() {
    if (!this.press) return;
    const { roads, active, sel } = this.press.undo;
    this.roads = roads;
    this.active = active;
    this.sel = sel;
    this.press = null;
  }

  pointerLeave() {
    if (!this.press) this.hover = null;
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

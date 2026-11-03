import type { DragState } from '../curves/drag';
import type { PathNode } from '../curves/types';
import type { Vec } from '../curves/vec';
import type { RoadHandle, RoadHit } from './chains';
import type { Graph, Placed } from '../model/graph';
import type { DrawEnd, NodeAction } from '../model/junction';
import type { ControlId, HintTarget } from '../hints/hints';

/** What the pointer is doing, as seen by the editor. `pt` is in world meters. */
export interface PointerInfo {
  pt: Vec;
  /** The same position in screen pixels, and the map from world to screen (for the selection box). */
  screen: Vec;
  project: (p: Vec) => Vec;
  /** Pixels per meter, for screen-sized hit areas. */
  scale: number;
  touch: boolean;
  shift: boolean;
  alt: boolean;
  /** Ctrl turns snapping off while it is held (^101). */
  ctrl: boolean;
}

/**
 * What is under the pointer: a handle to edit, and in draw mode also a curve to insert into or
 * the preview of the node a click would add (^48).
 */
export type Hover =
  | { kind: 'handle'; handle: RoadHandle }
  | { kind: 'candidate'; hit: RoadHit }
  | { kind: 'preview'; node: PathNode; ref: PathNode | null; end: DrawEnd };

/** Where a node would be placed: the pointer, or beside another lane with its heading (^22). */
export interface Placement {
  pt: Vec;
  th: number | null;
  /** The pointer snapped to a snap line (not a curve of a segment): a heading dragged there copies nothing (^319). */
  line?: boolean;
  /** The node the pointer snapped onto, if any: a radius point on a node of its segment means auto (^141). */
  node?: number | null;
}

/** Pointer travel (screen pixels) that turns a press into a drag. */
export const DRAG_PX = 6;

/**
 * What is edited and can be undone: the graph, the node being drawn from (`active`) with the way
 * the next edge runs (`end`) and the node the road being drawn started at (`origin`), and the selection.
 */
export interface Snapshot {
  graph: Graph;
  active: number | null;
  end: DrawEnd;
  origin: number | null;
  selection: number[];
}

/**
 * The left button is down: dragging a handle (a node drags the other selected nodes along, ^71),
 * placing a node (its heading by dragging), or, in select mode on empty canvas, a click that
 * enters draw mode or a drag that spans the selection box (^70).
 */
export type Press =
  | {
      kind: 'drag';
      /** The chain the handle is drawn on (for the focus) and the id of its node or edge. */
      road: number;
      id: number;
      drag: DragState;
      start: Vec;
      moved: boolean;
      /** What a click does to the roads: finish, extend, split or merge (^23, ^65). */
      act: NodeAction;
      /** The other selected nodes, as they were, moving with this one. */
      group: Placed[];
      origin: Vec;
      /** What a click without moving does to the selection (^71, ^72). */
      click: 'toggle' | 'collapse' | 'keep';
      /** The select operation a click without moving used (^110). */
      use: ControlId | null;
      /** Alt on a heading control point: a click flips the arm (^234). */
      flip: boolean;
      /** A radius point in draw mode: the place on the curve a click splits or merges at (^278). */
      curve: RoadHit | null;
      undo: Snapshot;
      target: HintTarget;
    }
  | {
      kind: 'place';
      id: number;
      undo: Snapshot;
      /** On a curve: what a click, but not a drag, does after the node was inserted (^133). */
      then: 'split' | 'merge' | null;
      moved: boolean;
      target: HintTarget;
      /** The angle the heading steps count from: where the node pointed when placed, or 0, north, for the first node of an arm (^315). */
      angleFrom: number;
      /** The first node of a new arm: its heading snaps to the compass directions, and a compass is shown (^316). */
      compass: boolean;
      /** The node was placed on a snap line (^319). */
      onLine: boolean;
    }
  | {
      kind: 'empty';
      screen: Vec;
      base: number[];
      shift: boolean;
      /** Alt on a curve: the click selects or deselects its branch (^128). */
      alt: boolean;
      /** The two nodes of the curve that was pressed (select mode), else none (^74). */
      curve: number[];
      moved: boolean;
      undo: Snapshot;
      target: HintTarget;
    };

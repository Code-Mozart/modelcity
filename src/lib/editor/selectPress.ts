import { networkOf } from '../map/network';
import { screenToWorld, type Point, type Size, type View } from '../camera/view';
import { nodesInBox, type LoadedMap } from '../map/hit';
import type { Editor } from './editor.svelte';
import { branchOf } from './branchOf';
import { afterClick, pick, reachOf, type Hover } from './pick';
import { afterBox, afterBranchAdd, afterBranchClick, type Selection } from './selection';

/** The pointer has to move this far (pixels) before a press is a drag and not a click. */
export const DRAG_PX = 4;

/** What the press needs to know of the screen and of what is loaded, as it is now. */
export interface Surroundings {
  map: () => LoadedMap;
  screen: () => { view: View; size: Size };
}

/** A press of the left button in select mode: what was under it, what was selected, and whether it moved. */
interface Pressed {
  on: Hover | null;
  at: Point;
  began: Selection;
  shift: boolean;
  alt: boolean;
  moved: boolean;
  waited: boolean;
}

/**
 * The left button in select mode (^1257): a click on a node or a segment or nothing picks, a drag
 * from nothing is a box (the selection follows it, one step when it ends). The rules of what a
 * click does are in `pick.ts` and `selection.ts`; this is the sequence of press, move and release.
 */
export class SelectPress {
  private pressed: Pressed | null = null;

  constructor(
    private editor: Editor,
    private around: Surroundings,
  ) {}

  get active() {
    return this.pressed !== null;
  }

  /** What is under a point of the screen: a node or a segment of what is loaded. */
  pickAt(at: Point, touch = false): Hover | null {
    const { view, size } = this.around.screen();
    return pick(this.around.map(), screenToWorld(view, size, at), reachOf(touch, view.scale));
  }

  down(at: Point, shift: boolean, alt = false) {
    const on = this.pickAt(at);
    this.pressed = {
      on,
      at,
      began: this.editor.selection,
      shift,
      alt,
      moved: false,
      waited: false,
    };
  }

  move(at: Point) {
    const p = this.pressed;
    if (!p || (!p.moved && Math.hypot(at.x - p.at.x, at.y - p.at.y) < DRAG_PX)) return;
    p.moved = true;
    this.editor.hover = null;
    // A press on a node or a segment that moves is the start of moving it (an operation that is not back yet).
    if (p.on) return;
    const box = nodesInBox(this.around.map(), this.around.screen(), p.at, at);
    p.waited = box.waiting > 0;
    this.editor.band = { a: p.at, b: at };
    this.editor.follow(afterBox(p.began, box.nodes, p.shift));
  }

  /** The button is released: what it did, a click that picked, a box, or nothing. */
  up(): 'click' | 'box' | null {
    const p = this.pressed;
    this.pressed = null;
    if (!p) return null;
    const { editor } = this;
    if (editor.band) {
      editor.band = null;
      editor.select(editor.selection, p.began);
      if (p.waited) editor.told?.('warning', WAITING_TEXT);
      return 'box';
    }
    if (p.moved) return null;
    if (p.alt && p.on) this.branchClick(p.on, p);
    else editor.select(afterClick(p.began, p.on, p.shift), p.began);
    return 'click';
  }

  /** Alt+click (^128, ^244): the branch of what is under the pointer; only what is loaded is followed (^1258). */
  private branchClick(on: Hover, p: Pressed) {
    const branch = branchOf(networkOf(this.around.map()), on);
    const pick = p.shift ? afterBranchAdd : afterBranchClick;
    this.editor.select(pick(p.began, branch.nodes), p.began);
    if (!branch.complete) this.editor.told?.('info', BRANCH_TEXT);
  }
}

export const BRANCH_TEXT =
  'The branch goes on beyond the loaded map: only the loaded part was selected.';

export const WAITING_TEXT =
  'Some chunks under the box are still loading: only the loaded ones were selected.';

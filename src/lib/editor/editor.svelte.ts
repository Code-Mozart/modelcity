import type { Point } from '../camera/view';
import { emptyGraph, type Graph } from '../model/graph';
import {
  NO_HISTORY,
  record,
  redoStep,
  undoStep,
  type History,
  type HistoryEvent,
  type Moved,
} from './history';
import type { ToastKind } from '../ui/toasts.svelte';
import type { Hover } from './pick';
import {
  applyDelta,
  deltaOf,
  NOTHING,
  sameSelection,
  selectionName,
  type Selection,
} from './selection';

/** View mode only moves the camera; select mode also picks (^394, ^395). */
export type Mode = 'view' | 'select';

/** The box that is being dragged, in pixels of the screen (^495). */
export interface Band {
  a: Point;
  b: Point;
}

/**
 * The map in memory (^1232): the graph, the clone of what a project stores. It is only ever behind
 * the storage by the autosave delay (`ProjectSession`). Everything that was made from it, and
 * every operation on it, was taken out (^1232) and is built again one operation at a time; so far
 * the mode, the selection and the history of the selection are back (^1257).
 */
export class Editor {
  graph = $state.raw<Graph>(emptyGraph());
  mode = $state<Mode>('select');
  /** The nodes that are selected. */
  selection = $state.raw<Selection>(NOTHING);
  /** Alt is held: a click picks the branch, and the hover shows it (^99, ^128). */
  alt = $state(false);
  /** What a click would pick now (^1257). */
  hover = $state.raw<Hover | null>(null);
  /** The box that is being dragged, if any. */
  band = $state.raw<Band | null>(null);
  history = $state.raw<History>(NO_HISTORY);
  /** The last thing that happened to the history, for the recent history panel (^107): a step taken, undone or redone. */
  event = $state.raw<HistoryEvent | null>(null);
  private seq = 0;
  /** Where the editor tells the user something (a toast): set by the app. */
  told: ((kind: ToastKind, text: string) => void) | null = null;

  /** Replace the map by that of a project: nothing of the project before stays selected or can be undone. */
  load(graph: Graph) {
    this.graph = graph;
    this.selection = NOTHING;
    this.hover = null;
    this.band = null;
    this.history = NO_HISTORY;
    this.event = null;
  }

  toggleMode() {
    this.mode = this.mode === 'select' ? 'view' : 'select';
    this.hover = null;
    this.band = null;
  }

  /** The selection while a box is dragged: it follows the box, and the step is taken when it ends (`select`). */
  follow(next: Selection) {
    this.selection = next;
  }

  /** The selection is `next` now, after it was `from`: a step of the history if it changed (^216). */
  select(next: Selection, from: Selection = this.selection) {
    this.selection = next;
    if (sameSelection(from, next)) return;
    const step = {
      name: selectionName(from, next),
      kind: 'select' as const,
      continues: true,
      selection: deltaOf(from, next),
      selectedAfter: next.size,
    };
    this.history = record(this.history, step);
    this.event = { seq: ++this.seq, kind: 'step', steps: this.history.past.slice(-1) };
  }

  deselectAll() {
    if (this.selection.size) this.select(NOTHING);
  }

  /** The selection could not stay (the memory has no room for its chunks, ^1257): it goes, and so does what could be undone of it. */
  dropSelection() {
    this.selection = NOTHING;
    this.history = NO_HISTORY;
    this.event = null;
  }

  undo(whole = false) {
    this.move(undoStep(this.history, whole), true);
  }

  redo(whole = false) {
    this.move(redoStep(this.history, whole), false);
  }

  /** Apply what moved; with nothing to move the user is told (^397, ^398). */
  private move(moved: Moved | null, undo: boolean) {
    if (!moved) {
      this.told?.('info', undo ? 'nothing to undo' : 'nothing to redo');
      return;
    }
    this.selection = moved.steps.reduce(
      (s, step) => applyDelta(s, step.selection, undo),
      this.selection,
    );
    this.history = moved.history;
    this.event = { seq: ++this.seq, kind: undo ? 'undo' : 'redo', steps: moved.steps };
  }
}

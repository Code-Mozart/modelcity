import type { Point } from '../camera/view';
import { inverse, isEmpty, type RowChange } from '../edit/change';
import { deleteEdges, deleteNodes, type RowSource } from '../edit/deleteNodes';
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
import type { LoadedMap } from '../map/hit';
import { byClick, type Doing } from './deleting';
import type { Hover } from './pick';
import {
  applyDelta,
  deltaOf,
  NOTHING,
  sameSelection,
  selectionName,
  withoutNodes,
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
  /** What the editor needs of the map to change it (^1260): where to read the rows an operation works on, and how a change is written (the storage, its index, the chunks in memory). Set by the app. */
  source: (() => RowSource) | null = null;
  writer: ((change: RowChange) => Promise<void>) | null = null;
  /** The map as it is loaded: what a hover or a click found is looked up in it. */
  loaded: (() => LoadedMap) | null = null;
  /** A change of the map is being written: the editor does nothing else meanwhile (every edit is atomic and blocks, ^1260). */
  busy = $state(false);

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

  /** Delete nodes or segments (^434, ^920): the change is worked out from the storage, written, and then it is one step. */
  async delete(doing: Doing) {
    const [source, writer] = [this.source, this.writer];
    if (this.busy || !source || !writer) return;
    await this.exclusively(async () => {
      const change =
        doing.kind === 'nodes'
          ? await deleteNodes(source(), doing.ids)
          : await deleteEdges(source(), doing.edges);
      if (isEmpty(change)) return;
      await writer(change);
      this.took(doing.name, change);
      if (doing.told) this.told?.('info', doing.told);
    });
  }

  /** The step of a change that was written: the nodes that are gone are not selected any more. */
  private took(name: string, change: RowChange) {
    const gone = change.nodes.flatMap((p) => (p.after || !p.before ? [] : [p.before[0]]));
    const [before, after] = [this.selection, withoutNodes(this.selection, gone)];
    this.selection = after;
    this.hover = null;
    this.history = record(this.history, {
      name,
      kind: null,
      continues: false,
      selection: deltaOf(before, after),
      selectedAfter: after.size,
      map: change,
    });
    this.event = { seq: ++this.seq, kind: 'step', steps: this.history.past.slice(-1) };
  }

  /** Do something that writes the map, one thing at a time; what goes wrong is told to the user and nothing else changes. */
  private async exclusively(work: () => Promise<void>) {
    this.busy = true;
    try {
      await work();
    } catch (e) {
      console.error('[modelcity] the change of the map failed', e);
      this.told?.('error', 'The change could not be written: nothing was changed.');
    } finally {
      this.busy = false;
    }
  }

  /** A click of the right button (^489, ^699, ^920): deletes what is under the pointer, or the selection if the pointer is on it. */
  async rightClick(on: Hover | null, alt: boolean) {
    const map = this.loaded?.();
    const doing = map && this.mode === 'select' ? byClick(this.selection, on, alt, map) : null;
    if (doing) await this.delete(doing);
  }

  async undo(whole = false) {
    await this.move(undoStep(this.history, whole), true);
  }

  async redo(whole = false) {
    await this.move(redoStep(this.history, whole), false);
  }

  /** Apply what moved; with nothing to move the user is told (^397, ^398). A step that changed the map writes the change again, or its inverse. */
  private async move(moved: Moved | null, undo: boolean) {
    if (!moved) {
      this.told?.('info', undo ? 'nothing to undo' : 'nothing to redo');
      return;
    }
    const writer = this.writer;
    if (moved.steps.some((s) => s.map)) {
      if (this.busy || !writer) return;
      let failed = true;
      await this.exclusively(async () => {
        for (const step of moved.steps)
          if (step.map) await writer(undo ? inverse(step.map) : step.map);
        failed = false;
      });
      if (failed) return;
    }
    this.selection = moved.steps.reduce(
      (s, step) => applyDelta(s, step.selection, undo),
      this.selection,
    );
    this.history = moved.history;
    this.event = { seq: ++this.seq, kind: undo ? 'undo' : 'redo', steps: moved.steps };
  }
}

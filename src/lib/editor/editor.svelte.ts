import type { Point } from '../camera/view';
import { compose, inverse, isEmpty, NO_CHANGE, type RowChange } from '../edit/change';
import type { NextIds } from '../edit/graphPiece';
import { NOT_DRAWING, sameDraw, type DrawState } from './drawing';
import type { Grip } from './moving';
import type { RowSource } from '../edit/deleteNodes';
import { planDelete, type DeletePlan } from './deletePlan';
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
  type Selection,
} from './selection';

/** View mode only moves the camera; select mode also picks (^394, ^395); draw mode places nodes (^40, ^1262). */
export type Mode = 'view' | 'select' | 'draw';

/** What the mode display shows (^119, ^120): extend mode is draw mode while a road is being drawn. */
export type Phase = Mode | 'extend';

/** An operation of the drawing as planned: its name, what it changes on the map, and the road being drawn after it. */
export interface Planned {
  name: string;
  change: RowChange;
  draw: DrawState;
  /** The node a split on a curve inserted: finishing at once gives the curve back (^237). */
  split?: number;
  /** The selection after it, where it changes (a dragged node is selected, ^72). */
  selection?: Selection;
}

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
  /** The road being drawn (^1262). */
  draw = $state.raw<DrawState>(NOT_DRAWING);
  phase = $derived<Phase>(this.mode === 'draw' && this.draw.active !== null ? 'extend' : this.mode);
  /** What the operation in progress would change, drawn over the map until it is written (^1262). */
  draft = $state.raw<RowChange | null>(null);
  /** What is being dragged, if anything, and whether letting it go merges (for the hints, ^286). */
  drag = $state.raw<{ grip: Grip; group: number; merges: boolean } | null>(null);
  /** Forget the press of the left button, if there is one (`Esc` while it is down, ^295); true if there was one. Set by the canvas. */
  cancelPress: (() => boolean) | null = null;
  /** The ids the next node and segment get (^1224): from the header of the open project. Set by the app. */
  ids: (() => NextIds) | null = null;
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
  /** Whether the map can be changed now: not while its index is built (a build that goes on while rows change would end with an index that is wrong, ^1260). Set by the app. */
  canEdit: (() => boolean) | null = null;
  /** The map as it is loaded: what a hover or a click found is looked up in it. */
  loaded: (() => LoadedMap) | null = null;
  /** A change of the map is being written: the editor does nothing else meanwhile (every edit is atomic and blocks, ^1260). */
  busy = $state(false);
  private waiting = 0;
  /** Counts the projects that were open: what was asked for an earlier one is not done in the one that is open now. */
  private epoch = 0;
  /** The node a split on a curve inserted, with the change that did it: finishing at once gives the curve back (^237). */
  private splitUndo: { node: number; change: RowChange } | null = null;
  private chain: Promise<void> = Promise.resolve();

  /** Replace the map by that of a project: nothing of the project before stays selected or can be undone. */
  load(graph: Graph) {
    this.epoch++;
    this.graph = graph;
    this.selection = NOTHING;
    this.draw = NOT_DRAWING;
    this.draft = null;
    if (this.mode === 'draw') this.mode = 'select';
    this.hover = null;
    this.band = null;
    this.history = NO_HISTORY;
    this.event = null;
  }

  /** `Tab` (^104): to view mode from any mode (a road being drawn is finished), and back to select mode. */
  toggleMode() {
    if (this.mode !== 'view') this.finishRoad();
    this.mode = this.mode === 'view' ? 'select' : 'view';
    this.hover = null;
    this.band = null;
  }

  /** Enter draw mode (a click on the void with nothing selected, ^120): the next click places the first node of a road. */
  enterDraw() {
    this.mode = 'draw';
    this.hover = null;
  }

  /**
   * Finish the road being drawn (^432): draw mode goes on without one; `toSelect` (`Esc`) goes to
   * select mode as well, as on `main`. A road of its first node only is cancelled: the node goes (^437).
   */
  finishRoad(toSelect = false) {
    if (this.mode !== 'draw') return;
    if (toSelect) this.mode = 'select';
    if (this.draw.active !== null) void this.drawStep(() => this.planFinish());
  }

  /** The step that finishes the road: right after a split on a curve it gives the curve back (^237); a road of its first node only loses that node (^437). */
  async planFinish(): Promise<Planned | null> {
    const [source, active] = [this.source?.(), this.draw.active];
    if (!source || active === null) return null;
    const split = this.splitUndo;
    if (split?.node === active)
      return { name: 'finish road', change: inverse(split.change), draw: NOT_DRAWING };
    const edges = await source.edgesAt([active]);
    if (edges.length) return { name: 'finish road', change: NO_CHANGE, draw: NOT_DRAWING };
    const nodes = await source.nodes([active]);
    const change = {
      nodes: nodes.map((n) => ({ before: n, after: null })),
      edges: [],
      context: [],
    };
    return { name: 'cancel first node', change, draw: NOT_DRAWING };
  }

  /**
   * An operation of the drawing (^1262), in its turn (`queued`): planned from what it finds then,
   * written, and one step that holds the change and the road being drawn before and after it. A
   * step while a road is drawn joins the batch of the steps before (^216).
   */
  drawStep(plan: () => Promise<Planned | null>): Promise<void> {
    const writer = this.writer;
    if (!writer) return Promise.resolve();
    const epoch = this.epoch;
    return this.queued(async () => {
      try {
        const p = await plan();
        if (!p) return;
        if (!isEmpty(p.change)) await writer(p.change);
        if (epoch === this.epoch) this.drawn(p);
      } finally {
        // What the press showed goes, also when it was not written.
        this.draft = null;
      }
    });
  }

  /** A planned operation of the drawing was written: the road being drawn after it, and its step. */
  private drawn(p: Planned) {
    const before = this.draw;
    const was = this.selection;
    if (p.selection) this.selection = p.selection;
    this.draw = p.draw;
    this.draft = null;
    this.splitUndo = p.split !== undefined ? { node: p.split, change: p.change } : null;
    if (isEmpty(p.change) && sameDraw(before, p.draw) && sameSelection(was, this.selection)) return;
    const drawing = before.active !== null || p.draw.active !== null;
    this.history = record(this.history, {
      name: p.name,
      kind: drawing ? 'draw' : null,
      continues: before.active !== null,
      selection: deltaOf(was, this.selection),
      selectedAfter: this.selection.size,
      ...(isEmpty(p.change) ? {} : { map: p.change }),
      ...(drawing ? { draw: { before, after: p.draw } } : {}),
    });
    this.event = { seq: ++this.seq, kind: 'step', steps: this.history.past.slice(-1) };
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
    if (this.selection.size && !this.busy) this.select(NOTHING);
  }

  /** The selection could not stay (the memory has no room for its chunks, ^1257): it goes, and so does what could be undone of it. */
  dropSelection() {
    this.selection = NOTHING;
    this.history = NO_HISTORY;
    this.event = null;
  }

  /** Delete nodes or segments (^434, ^920): the change is worked out from the storage, written, and then it is one step; the road being drawn follows (^70). */
  async delete(doing: Doing) {
    const [source, writer] = [this.source, this.writer];
    if (!source || !writer) return;
    const epoch = this.epoch;
    await this.queued(async () => {
      const plan = await planDelete(doing, source(), this.draw);
      if (isEmpty(plan.change)) return;
      await writer(plan.change);
      // The project was changed while it was written: the step belongs to the other one.
      if (epoch === this.epoch) this.took(doing.name, plan);
    });
  }

  /** The step of a change that was written: nothing is selected any more, as on `main` (a removal ends with `selection: []`, ^434). */
  private took(name: string, { change, draw }: DeletePlan) {
    const [before, after] = [this.selection, NOTHING];
    const drawn = this.draw;
    const drawing = drawn.active !== null || draw.active !== null;
    [this.selection, this.draw, this.hover, this.splitUndo] = [after, draw, null, null];
    this.history = record(this.history, {
      name,
      kind: drawing ? 'draw' : null,
      continues: drawing,
      selection: deltaOf(before, after),
      selectedAfter: 0,
      map: change,
      ...(drawing ? { draw: { before: drawn, after: draw } } : {}),
    });
    this.event = { seq: ++this.seq, kind: 'step', steps: this.history.past.slice(-1) };
  }

  /**
   * Do something that writes the map, one thing at a time, in the order it was asked for (^1260): what
   * is asked while a change is written waits for its turn and is worked out then, from the state
   * it finds (two quick `Ctrl+Z` are two undos). What goes wrong is told to the user and changes nothing.
   */
  private queued(work: () => Promise<void>): Promise<void> {
    this.waiting++;
    this.busy = true;
    const epoch = this.epoch;
    const done = this.chain
      .then(() => {
        // The project was changed while this waited: it was asked for another one.
        if (epoch !== this.epoch) return;
        if (this.canEdit && !this.canEdit()) throw new Error('the map cannot be changed now');
        return work();
      })
      .catch((e: unknown) => {
        console.error('[modelcity] the change of the map failed', e);
        this.told?.('error', 'The change could not be written: nothing was changed.');
      });
    this.chain = done.finally(() => {
      if (--this.waiting === 0) this.busy = false;
    });
    return done;
  }

  /** A click of the right button (^489, ^699, ^920): deletes what is under the pointer, or the selection if the pointer is on it; on nothing it finishes the road being drawn (^43, ^720). */
  async rightClick(on: Hover | null, alt: boolean) {
    const map = this.loaded?.();
    if (this.mode === 'view') return;
    const doing = map ? byClick(this.selection, on, alt, map) : null;
    if (doing) await this.delete(doing);
    else this.finishRoad();
  }

  undo(whole = false) {
    return this.step(undoStep, whole, true);
  }

  redo(whole = false) {
    return this.step(redoStep, whole, false);
  }

  /** What an undo or redo does when it is asked for: a selection that goes back, and nothing to undo, at once; a change of the map waits for its turn and is worked out then (^1260). */
  private step(pick: typeof undoStep, whole: boolean, undo: boolean): Promise<void> {
    const moved = this.busy ? null : pick(this.history, whole);
    if (!this.busy && !moved) this.nothing(undo);
    else if (moved && !moved.steps.some((s) => s.map)) this.apply(moved, undo);
    else {
      const epoch = this.epoch;
      return this.queued(() => this.move(pick(this.history, whole), undo, epoch));
    }
    return Promise.resolve();
  }

  private nothing(undo: boolean) {
    this.told?.('info', undo ? 'nothing to undo' : 'nothing to redo');
  }

  /** Called when its turn has come: the steps that changed the map are written as one change, all or nothing (a failed write is thrown and nothing changes). */
  private async move(moved: Moved | null, undo: boolean, epoch = this.epoch) {
    if (!moved) return this.nothing(undo);
    const changes = moved.steps.flatMap((s) => (s.map ? [undo ? inverse(s.map) : s.map] : []));
    if (changes.length) {
      // A step of the map cannot move without a way to write it: the history stays as it is.
      if (!this.writer) throw new Error('there is no way to write the map');
      await this.writer(compose(changes));
    }
    if (epoch === this.epoch) this.apply(moved, undo);
  }

  private apply(moved: Moved, undo: boolean) {
    this.selection = moved.steps.reduce(
      (s, step) => applyDelta(s, step.selection, undo),
      this.selection,
    );
    // The road being drawn goes back to how it was before the oldest step undone, or after the newest one done again.
    const drawn = moved.steps.filter((s) => s.draw).at(-1)?.draw;
    if (drawn) this.draw = undo ? drawn.before : drawn.after;
    if (this.draw.active !== null) this.mode = 'draw';
    this.splitUndo = null;
    this.draft = null;
    this.history = moved.history;
    this.event = { seq: ++this.seq, kind: undo ? 'undo' : 'redo', steps: moved.steps };
  }
}

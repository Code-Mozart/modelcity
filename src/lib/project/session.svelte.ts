import { SvelteDate } from 'svelte/reactivity';
import { ProjectModal, type Notify } from './modalState.svelte';
import type { Camera } from '../camera/camera.svelte';
import type { Editor } from '../editor/editor.svelte';
import { emptyGraph, type Graph } from '../model/graph';
import { cameraOf, exportText, ProjectFileError, type CameraState, type Project } from './file';
import { lastId, remember, uid } from './browserMemory';
import { download, exportName } from './download';
import { openStored } from './open';
import { createEmpty, headerFor, persist, withIdsOf } from './persist';
import type { NextIds } from '../edit/graphPiece';
import { importStream, type ImportProgress } from './streamImport';
import { piecesOfFile, piecesOfText } from './textPieces';
import {
  type Header,
  type IndexChange,
  type MapChange,
  type ProjectStorage,
  type StoredHeader,
} from './storage';

/** How long after a change the project is saved to the browser (^166). */
export const AUTOSAVE_MS = 400;
/** The longest a change waits for its save while more changes keep coming (^183). */
export const AUTOSAVE_MAX_WAIT_MS = 5000;
/** How long the camera has to rest before it is saved, if it was the only thing that changed (^236). */
export const CAMERA_SAVE_MS = 1000;
export type { Notify };
const MAX_TITLE = 100;
const UNTITLED = 'Untitled project';
const NEW_CAMERA: CameraState = { x: 0, y: 0, scale: 4, rotation: 0 };

const unreadable = (e: unknown) => new ProjectFileError('unreadable', '^208', String(e));

/**
 * The open project: its title and dates, the browser storage it is kept in, autosave, import and
 * export (^82, ^148). The editor and the camera hold the map and the view.
 */
export class ProjectSession extends ProjectModal {
  /** The id of the open project; empty while there is none (^189). */
  id = $state('');
  /** True when the projects of the browser were looked at and one was opened, if there is any. */
  ready = $state(false);
  title = $state(UNTITLED);
  /** The projects kept in the browser, newest first (shown by the modal). */
  projects = $state.raw<StoredHeader[]>([]);
  error = $state<string | null>(null);
  /** True while a rename is written: the modal does not react meanwhile. */
  busy = $state(false);
  /** The rows of a file that is being imported, written so far (^1256); null when none is. */
  importing = $state<ImportProgress | null>(null);
  private createdAt = '';
  private lastUpdatedAt = '';
  private saved: Graph | null = null;
  /** The header of the open project as it is stored: what of it is not the session's own (the lane configurations, the id counters) is kept as it is (^1236). */
  private header: Header | null = null;
  /** The map as it is in the storage; null: the project is not there yet. */
  private stored: Graph | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** When the oldest change that is not saved yet happened. */
  private waitingSince: number | null = null;
  private cameraTimer: ReturnType<typeof setTimeout> | undefined;
  /** The camera as it was last saved or loaded, so that a camera that did not move is not saved. */
  private savedCamera = '';

  /** There is no project: a blank map that is only saved as a project once it has something in it (^189). */
  get noProject() {
    return this.id === '';
  }

  private now: () => string;
  protected notify: Notify;

  constructor(
    private editor: Editor,
    private camera: Camera,
    private storage: ProjectStorage,
    deps: { now?: () => string; notify?: Notify } = {},
  ) {
    super();
    this.now = deps.now ?? (() => new SvelteDate().toISOString());
    this.notify = deps.notify ?? (() => {});
  }

  /** Open the project that was open last, or the newest; with none, there is no project yet (^189). */
  async start() {
    const all = await this.refresh();
    const last = all.find((p) => p.id === lastId()) ?? all[0];
    if (last && !(await this.tryShow(last.id))) this.showBlank();
    this.ready = true;
  }

  private async refresh() {
    const all = await this.storage.list();
    this.projects = all.sort((a, b) =>
      String(b.file.lastUpdatedAt ?? '').localeCompare(String(a.file.lastUpdatedAt ?? '')),
    );
    return this.projects;
  }

  /** Make the project the open one: its title, dates and view. Its map is not read (^1236). */
  private enter(id: string, header: Header) {
    this.id = id;
    [this.title, this.createdAt, this.lastUpdatedAt] = [
      header.title,
      header.createdAt,
      header.lastUpdatedAt,
    ];
    this.header = header;
    this.editor.load(emptyGraph());
    this.camera.restore(cameraOf(header));
    this.saved = this.stored = this.editor.graph;
    this.savedCamera = JSON.stringify(this.camera.state);
    remember(id);
  }

  /**
   * Open a stored project (^229): its header is checked, and one of an older data model is
   * converted first (`openStored`). One that is refused is told to the user in a toast (the same
   * texts as an import, ^209) and stays in the storage as it is; nothing changes. False when it
   * was refused.
   */
  private async tryShow(id: string): Promise<boolean> {
    try {
      const { header, converted } = await openStored(this.storage, id);
      this.enter(id, header);
      if (converted) this.notify('info', converted);
      return true;
    } catch (e) {
      const refusal = e instanceof ProjectFileError ? e : unreadable(e);
      console.error(`[modelcity] load refused (${refusal.hat}): ${refusal.detail}`);
      this.notify('error', refusal.message);
      return false;
    }
  }

  /** Forget a save that is waiting. */
  private cancelSave() {
    clearTimeout(this.timer);
    this.waitingSince = null;
  }

  /** There is something to keep: a project is open, or the blank map has data (^189). */
  private get worthKeeping() {
    return this.id !== '' || this.hasData();
  }

  private project(): Project {
    const { title, createdAt, lastUpdatedAt } = this;
    return { title, createdAt, lastUpdatedAt, camera: this.camera.state, graph: this.editor.graph };
  }

  private hasData() {
    return this.editor.graph.nodes.length > 0;
  }

  /** The first save of a map without a project makes it one (^189). */
  private begin(title = UNTITLED) {
    const stamp = this.now();
    this.id = uid();
    this.stored = this.header = null;
    [this.title, this.createdAt, this.lastUpdatedAt] = [title, stamp, stamp];
    remember(this.id);
  }

  /**
   * Write a change that an operation made on the map (^1260): straight to the storage, with what it
   * does to the segment index, in one step; the project's date is now. The map is not held here
   * (^1236), only the header is kept in step.
   */
  async commitMap(change: MapChange, index: IndexChange) {
    // A change of a blank map makes it a project (^189): stored with an empty, complete index first.
    if (!this.id) await this.create();
    if (!this.id) throw new Error('there is no open project to write the change to');
    this.lastUpdatedAt = this.now();
    const header = (this.header = withIdsOf(change, headerFor(this.project(), this.header)));
    await this.storage.patch(this.id, header, change, index);
  }

  /** Told when a blank map became a project (^189), before it is the open one: its index is complete and its map empty. Set by the app. */
  onCreated: ((id: string) => void) | null = null;

  /** The ids the next node and segment of the open project get (^1224); 0 for a blank map. */
  nextIds(): NextIds {
    return { node: this.header?.nextNodeId ?? 0, edge: this.header?.nextEdgeId ?? 0 };
  }

  /** The blank map becomes a project, stored with no rows and a complete index, before the first change is written to it (^189, ^1262). */
  private async create() {
    const stamp = this.now();
    const p = { ...this.project(), title: UNTITLED, createdAt: stamp, lastUpdatedAt: stamp };
    const { id, header } = await createEmpty(this.storage, p);
    [this.title, this.createdAt, this.lastUpdatedAt] = [p.title, stamp, stamp];
    this.stored = this.saved = this.editor.graph;
    this.header = header;
    this.onCreated?.(id);
    this.id = id;
    remember(id);
    await this.refresh();
  }

  /** Write the project to the browser now. Only a change of the map counts as an update, not a rename or the camera. */
  async save(touch = true) {
    this.cancelSave();
    if (!this.worthKeeping) return;
    if (!this.id) this.begin();
    else if (touch) this.lastUpdatedAt = this.now();
    const [was, graph] = [this.stored, this.editor.graph];
    this.saved = this.stored = graph;
    this.savedCamera = JSON.stringify(this.camera.state);
    const p = this.project();
    const header = (this.header = headerFor(p, this.header));
    await persist(this.storage, this.id, { was, project: p, header });
  }

  /** Save what is not saved yet (before another project opens, a modal lists them, the page closes). The date only changes if the map did. */
  async flush() {
    if (this.worthKeeping) await this.save(this.editor.graph !== this.saved);
  }

  /** The graph may have changed (called whenever it does): save it after a short while: debounced, but at the latest after a maximum wait, so a long edit is saved on the way (^166, ^183). Moving the camera alone does not. */
  changed() {
    if (this.editor.graph === this.saved || !this.worthKeeping) return;
    const now = Date.now();
    this.waitingSince ??= now;
    clearTimeout(this.timer);
    const wait = Math.min(AUTOSAVE_MS, Math.max(0, this.waitingSince + AUTOSAVE_MAX_WAIT_MS - now));
    this.timer = setTimeout(() => void this.save(), wait);
  }

  /**
   * The camera moved (called whenever it does): save it once it has rested, without touching the
   * date; a camera that is where it was saved is not saved again (^236). The write when the page
   * closes alone is not reliable: it is asynchronous and the page may be gone before it ends.
   */
  cameraMoved() {
    clearTimeout(this.cameraTimer);
    if (JSON.stringify(this.camera.state) === this.savedCamera || !this.worthKeeping) return;
    this.cameraTimer = setTimeout(() => void this.flush(), CAMERA_SAVE_MS);
  }

  /** A blank map and no project, until something is drawn (^171, ^189). */
  private showBlank() {
    this.cancelSave();
    this.id = '';
    this.stored = this.header = null;
    this.title = UNTITLED;
    this.editor.load(emptyGraph());
    this.camera.restore(NEW_CAMERA);
    this.saved = this.editor.graph;
    this.savedCamera = JSON.stringify(this.camera.state);
  }

  /** The new project button: save the open project, then there is no project (^171). With none, nothing changes. */
  async newProject() {
    if (!this.mayLeave()) return;
    if (this.worthKeeping) {
      await this.flush();
      this.showBlank();
      await this.refresh();
    }
    this.closeModal();
  }

  /** A project made of a file (^164): its map is written to the storage as it is read (^1256), and opened without its map (^1236). */
  private async adopt(pieces: AsyncIterable<string>) {
    await this.flush();
    // Opening a file is not a change of the map: the project keeps the dates of the file (^214).
    const id = uid();
    this.importing = { nodes: 0, edges: 0 };
    try {
      const header = await importStream(this.storage, id, pieces, (p) => (this.importing = p));
      this.enter(id, header);
      await this.refresh();
      return header;
    } catch (e) {
      await this.storage.remove(id).catch(() => undefined);
      throw e;
    } finally {
      this.importing = null;
    }
  }

  async open(id: string) {
    if (!this.mayLeave()) return;
    if (id === this.id) {
      this.closeModal();
      return;
    }
    const target = (await this.refresh()).find((p) => p.id === id);
    if (!target) return;
    await this.flush();
    if (await this.tryShow(target.id)) this.closeModal();
  }

  async remove(id: string) {
    await this.storage.remove(id);
    if (id !== this.id) {
      await this.refresh();
      return;
    }
    const rest = await this.refresh();
    if (!rest[0] || !(await this.tryShow(rest[0].id))) this.showBlank();
  }

  /** Open a project from a file the user picked; one that cannot be read is refused like one that is no project (^208). */
  async importFile(file: Parameters<typeof piecesOfFile>[0]) {
    if (this.mayLeave()) await this.importPieces(piecesOfFile(file));
  }

  /** The user is told in a word, the console gets the details (^209). */
  private refuse(e: ProjectFileError) {
    console.error(`[modelcity] import refused (${e.hat}): ${e.detail}`);
    this.error = e.message;
  }

  /** Open a project from the text of a file as a new project of the browser (^164). */
  importText(text: string) {
    return this.importPieces(piecesOfText(text));
  }

  /** Open a project from a file that arrives in pieces: a refusal tells the user in a word, the console the details (^209). */
  async importPieces(pieces: AsyncIterable<string>) {
    try {
      const header = await this.adopt(pieces);
      this.error = null;
      this.notify('success', `imported ${header.title}`);
      this.closeModal();
    } catch (e) {
      this.refuse(e instanceof ProjectFileError ? e : unreadable(e));
    }
  }

  /** Give a project a new name (an empty one is refused) and save it at once. The date of the last change stays (^177). */
  async rename(id: string, title: string) {
    const name = title.trim().slice(0, MAX_TITLE);
    this.cancelRow();
    const target = this.projects.find((p) => p.id === id);
    if (!name || !target || name === target.file.title) return;
    this.projects = this.projects.map((p) =>
      p.id === id ? { id, file: { ...p.file, title: name } } : p,
    );
    this.busy = true;
    try {
      if (id === this.id) {
        this.title = name;
        await this.save(false);
      } else {
        await this.storage.patch(id, { ...target.file, title: name });
      }
    } finally {
      this.busy = false;
    }
  }

  /** Delete the project of the card asked about; it is gone for good (^177). */
  async confirmDelete() {
    const id = this.row?.id;
    this.row = null;
    if (id) await this.remove(id);
  }

  /** The project as the text of an export file (^163): what is stored, since the map is not in memory (^1236); a blank map that was never saved is exported as it is. */
  async exportText() {
    await this.flush();
    const stored = this.id ? await this.storage.load(this.id) : undefined;
    return stored ? JSON.stringify(stored, null, 2) : exportText(this.project(), this.now());
  }

  /** `Ctrl+S` (^226): save the open project to the browser at once, and say so (^232). */
  async saveNow() {
    if (!this.worthKeeping) this.notify('info', 'nothing to save yet');
    else {
      await this.flush();
      this.notify('success', 'saved');
    }
    this.notify('info', 'modelcity saves automatically');
  }

  /** Let the user save the project as a file: the button `Export JSON` (^226). */
  async exportJson() {
    const name = exportName(this.title);
    download(name, await this.exportText());
    this.notify('success', `exported ${name}`);
  }

  /** Open the projects modal; `importFile`: and its file window (`Ctrl+O`, ^223). */
  async openModal(importFile = false) {
    this.error = null;
    this.row = null;
    await this.flush();
    await this.refresh();
    this.wantsImport = importFile;
    this.modalOpen = true;
  }
}

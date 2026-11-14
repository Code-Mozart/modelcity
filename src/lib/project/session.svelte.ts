import { SvelteDate } from 'svelte/reactivity';
import type { ModalTarget } from './modalHints';
import type { Camera } from '../camera/camera.svelte';
import type { Editor } from '../editor/editor.svelte';
import { emptyGraph, type Graph } from '../model/graph';
import {
  FILE_VERSION,
  fromFile,
  isOlder,
  ProjectFileError,
  toFile,
  type CameraState,
  type Project,
} from './file';
import { lastId, remember, uid } from './browserMemory';
import { download, exportName } from './download';
import { parseProject, readProject } from './migrate';
import type { ToastKind } from '../ui/toasts.svelte';
import type { ProjectStorage, StoredProject } from './storage';

/** How long after a change the project is saved to the browser (^166). */
export const AUTOSAVE_MS = 400;
/** The longest a change waits for its save while more changes keep coming (^183). */
export const AUTOSAVE_MAX_WAIT_MS = 5000;
/** How long the camera has to rest before it is saved, if it was the only thing that changed (^236). */
export const CAMERA_SAVE_MS = 1000;
const MAX_TITLE = 100;
const UNTITLED = 'Untitled project';
const NEW_CAMERA: CameraState = { x: 0, y: 0, scale: 4, rotation: 0 };

/** Tell the user something (a toast, ^232). */
export type Notify = (kind: ToastKind, text: string) => void;

const unreadable = (e: unknown) => new ProjectFileError('unreadable', '^208', String(e));

/**
 * The open project: its title and dates, the browser storage it is kept in, autosave, import and
 * export (^82, ^148). The editor and the camera hold the map and the view.
 */
export class ProjectSession {
  /** The id of the open project; empty while there is none (^189). */
  id = $state('');
  /** True when the projects of the browser were looked at and one was opened, if there is any. */
  ready = $state(false);
  title = $state(UNTITLED);
  modalOpen = $state(false);
  /** The projects kept in the browser, newest first (shown by the modal). */
  projects = $state.raw<StoredProject[]>([]);
  error = $state<string | null>(null);
  /** The card being renamed or asked to be deleted (a second click confirms), if any. */
  row = $state<{ id: string; mode: 'rename' | 'delete' } | null>(null);
  /** What the pointer is over in the modal, for the hints (^181). */
  over = $state<ModalTarget | null>(null);
  /** The name being typed in a rename differs from the title: closing would throw it away (^233). */
  renameDirty = $state(false);
  /** The modal was opened to import: it opens the file window as soon as it is there (^223). */
  wantsImport = $state(false);
  /** True while a rename is written: the modal does not react meanwhile. */
  busy = $state(false);
  private createdAt = '';
  private lastUpdatedAt = '';
  private saved: Graph | null = null;
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
  private notify: Notify;

  constructor(
    private editor: Editor,
    private camera: Camera,
    private storage: ProjectStorage,
    deps: { now?: () => string; notify?: Notify } = {},
  ) {
    this.now = deps.now ?? (() => new SvelteDate().toISOString());
    this.notify = deps.notify ?? (() => {});
  }

  /** Open the project that was open last, or the newest; with none, there is no project yet (^189). */
  async start() {
    const all = await this.refresh();
    const last = all.find((p) => p.id === lastId()) ?? all[0];
    if (last && !this.tryShow(last)) this.showBlank();
    this.ready = true;
  }

  private async refresh() {
    const all = await this.storage.list();
    this.projects = all.sort((a, b) =>
      String(b.file.lastUpdatedAt ?? '').localeCompare(String(a.file.lastUpdatedAt ?? '')),
    );
    return this.projects;
  }

  /**
   * Put the camera of a project back. The camera keeps the view on the content, so it has to know
   * the content of this project first, not the one before (else it pulls the stored view toward
   * that).
   */
  private showCamera(camera: CameraState) {
    this.camera.setAnchors(this.editor.anchors);
    this.camera.restore(camera);
  }

  /** Make the project the open one: its title, dates, map and view. */
  private enter(id: string, p: Project) {
    this.id = id;
    [this.title, this.createdAt, this.lastUpdatedAt] = [p.title, p.createdAt, p.lastUpdatedAt];
    this.editor.load(p.graph);
    this.showCamera(p.camera);
    this.saved = this.editor.graph;
    this.savedCamera = JSON.stringify(this.camera.state);
    remember(id);
  }

  /**
   * Open a stored project through the one pipeline (^229): migrated and checked like an import. One
   * that is refused is told to the user in a toast (the same texts as an import, ^209) and stays in
   * the storage as it is; nothing changes. False when it was refused.
   */
  private tryShow({ id, file }: StoredProject): boolean {
    try {
      const p = fromFile(readProject(file));
      this.enter(id, p);
      if (isOlder(file)) {
        // Converted when it opened: say so and save it in the new version at once, the date stays (^1226).
        this.notify(
          'info',
          `${p.title} was converted to version ${FILE_VERSION} of the data model and saved`,
        );
        void this.save(false);
      }
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
    [this.title, this.createdAt, this.lastUpdatedAt] = [title, stamp, stamp];
    remember(this.id);
  }

  /** Write the project to the browser now. Only a change of the map counts as an update, not a rename or the camera. */
  async save(touch = true) {
    this.cancelSave();
    if (!this.worthKeeping) return;
    if (!this.id) this.begin();
    else if (touch) this.lastUpdatedAt = this.now();
    this.saved = this.editor.graph;
    this.savedCamera = JSON.stringify(this.camera.state);
    await this.storage.put({ id: this.id, file: toFile(this.project()) });
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
    this.title = UNTITLED;
    this.editor.load(emptyGraph());
    this.showCamera(NEW_CAMERA);
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

  /** A project made of a file (^164). */
  private async adopt(project: Project) {
    await this.flush();
    // Opening a file is not a change of the map: the project keeps the dates of the file (^214).
    this.enter(uid(), project);
    await this.save(false);
    await this.refresh();
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
    if (this.tryShow(target)) this.closeModal();
  }

  async remove(id: string) {
    await this.storage.remove(id);
    if (id !== this.id) {
      await this.refresh();
      return;
    }
    const rest = await this.refresh();
    if (!rest[0] || !this.tryShow(rest[0])) this.showBlank();
  }

  /** Open a project from a file the user picked; one that cannot be read is refused like one that is no project (^208). */
  async importFile(file: { text(): Promise<string> }) {
    if (!this.mayLeave()) return;
    let text: string;
    try {
      text = await file.text();
    } catch (e) {
      this.refuse(unreadable(e));
      return;
    }
    await this.importText(text);
  }

  /** The user is told in a word, the console gets the details (^209). */
  private refuse(e: ProjectFileError) {
    console.error(`[modelcity] import refused (${e.hat}): ${e.detail}`);
    this.error = e.message;
  }

  /** Open a project from the text of a file as a new project of the browser (^164). A refusal tells the user in a word, the console the details (^209). */
  async importText(text: string) {
    try {
      const p = fromFile(parseProject(text));
      await this.adopt(p);
      this.error = null;
      this.notify('success', `imported ${p.title}`);
      this.closeModal();
    } catch (e) {
      this.refuse(e instanceof ProjectFileError ? e : unreadable(e));
    }
  }

  /**
   * Whether the user may leave what they are doing in the modal: not while a rename has a name
   * that was changed (^233, avoid accidental actions that discard work); it says why.
   */
  mayLeave(): boolean {
    if (this.row?.mode !== 'rename' || !this.renameDirty) return true;
    this.notify('warning', 'Finish or cancel the rename first.');
    return false;
  }

  startRename(id: string) {
    if (this.mayLeave()) this.row = { id, mode: 'rename' };
  }

  startDelete(id: string) {
    if (this.mayLeave()) this.row = { id, mode: 'delete' };
  }

  cancelRow() {
    this.row = null;
    this.renameDirty = false;
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
        await this.storage.put({ id, file: { ...target.file, title: name } });
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

  /** The project as the text of an export file (^163). */
  exportText() {
    const stamp = this.now();
    const p = {
      ...this.project(),
      createdAt: this.createdAt || stamp,
      lastUpdatedAt: this.lastUpdatedAt || stamp,
    };
    return JSON.stringify(toFile(p), null, 2);
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
  exportJson() {
    const name = exportName(this.title);
    download(name, this.exportText());
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

  /** Close the modal if the user may leave (a click outside, the cross): see `mayLeave`. */
  requestClose() {
    if (this.mayLeave()) this.closeModal();
  }

  closeModal() {
    this.modalOpen = false;
    this.row = null;
    this.renameDirty = false;
    this.over = null;
  }
}

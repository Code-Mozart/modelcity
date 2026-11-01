import { SvelteDate } from 'svelte/reactivity';
import { fuzzyFilter } from '../fuzzy';
import type { DialogTarget } from '../hints';
import type { Camera } from '../camera.svelte';
import type { Editor } from '../editor.svelte';
import { emptyGraph, type Graph } from '../model/graph';
import { fromFile, toFile, type CameraState, type Project } from './file';
import { parseProject } from './migrate';
import type { ProjectStorage, StoredProject } from './storage';

/** How long after a change the project is saved to the browser (^166). */
export const AUTOSAVE_MS = 400;
/** The longest a change waits for its save while more changes keep coming (^183). */
export const AUTOSAVE_MAX_WAIT_MS = 5000;
const MAX_TITLE = 100;
const LAST_KEY = 'modelcity.project';
const NEW_CAMERA: CameraState = { x: 0, y: 0, scale: 4, rotation: 0 };

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const remember = (id: string) => {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* private mode: the app then opens a new project next time */
  }
};

const lastId = () => {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
};

/**
 * The open project: its title and dates, the browser storage it is kept in, autosave, import and
 * export (^82, ^148). The editor and the camera hold the map and the view.
 */
export class ProjectSession {
  /** The id of the open project; empty while there is none (^189). */
  id = $state('');
  /** True when the projects of the browser were looked at and one was opened, if there is any. */
  ready = $state(false);
  title = $state('Untitled project');
  dialogOpen = $state(false);
  /** The projects kept in the browser, newest first (shown by the dialog). */
  projects = $state.raw<StoredProject[]>([]);
  error = $state<string | null>(null);
  /** What the projects dialog searches for (^178). */
  query = $state('');
  /** The card being renamed or asked to be deleted (a second click confirms), if any. */
  row = $state<{ id: string; mode: 'rename' | 'delete' } | null>(null);
  /** What the pointer is over in the dialog, for the hints (^181). */
  over = $state<DialogTarget | null>(null);
  /** True while a rename is written: the dialog does not react meanwhile. */
  busy = $state(false);
  private createdAt = '';
  private lastUpdatedAt = '';
  private saved: Graph | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** When the oldest change that is not saved yet happened. */
  private waitingSince: number | null = null;

  /** There is no project: a blank map that is only saved as a project once it has something in it (^189). */
  get noProject() {
    return this.id === '';
  }

  constructor(
    private editor: Editor,
    private camera: Camera,
    private storage: ProjectStorage,
    private now: () => string = () => new SvelteDate().toISOString(),
  ) {}

  /** Open the project that was open last, or the newest; with none, there is no project yet (^189). */
  async start() {
    const all = await this.refresh();
    const last = all.find((p) => p.id === lastId()) ?? all[0];
    if (last) this.show(last);
    this.ready = true;
  }

  private async refresh() {
    const all = await this.storage.list();
    this.projects = all.sort((a, b) => b.file.lastUpdatedAt.localeCompare(a.file.lastUpdatedAt));
    return this.projects;
  }

  private show({ id, file }: StoredProject) {
    const p = fromFile(file);
    this.id = id;
    [this.title, this.createdAt, this.lastUpdatedAt] = [p.title, p.createdAt, p.lastUpdatedAt];
    this.editor.load(p.graph);
    this.camera.restore(p.camera);
    this.saved = this.editor.graph;
    remember(id);
  }

  private project(): Project {
    const { title, createdAt, lastUpdatedAt } = this;
    return { title, createdAt, lastUpdatedAt, camera: this.camera.state, graph: this.editor.graph };
  }

  private hasData() {
    return this.editor.graph.nodes.length > 0;
  }

  /** The first save of a map without a project makes it one (^189). */
  private begin(title = 'Untitled project') {
    const stamp = this.now();
    this.id = uid();
    [this.title, this.createdAt, this.lastUpdatedAt] = [title, stamp, stamp];
    remember(this.id);
  }

  /** Write the project to the browser now. Only a change of the map counts as an update, not a rename or the camera. */
  async save(touch = true) {
    clearTimeout(this.timer);
    this.waitingSince = null;
    if (!this.id && !this.hasData()) return;
    if (!this.id) this.begin();
    else if (touch) this.lastUpdatedAt = this.now();
    this.saved = this.editor.graph;
    await this.storage.put({ id: this.id, file: toFile(this.project()) });
  }

  /** Save what is not saved yet (before another project opens, a dialog lists them, the page closes). The date only changes if the map did. */
  async flush() {
    if (this.id || this.hasData()) await this.save(this.editor.graph !== this.saved);
  }

  /** The graph may have changed (called whenever it does): save it after a short while: debounced, but at the latest after a maximum wait, so a long edit is saved on the way (^166, ^183). Moving the camera alone does not. */
  changed() {
    if (this.editor.graph === this.saved || (!this.id && !this.hasData())) return;
    const now = Date.now();
    this.waitingSince ??= now;
    clearTimeout(this.timer);
    const wait = Math.min(AUTOSAVE_MS, Math.max(0, this.waitingSince + AUTOSAVE_MAX_WAIT_MS - now));
    this.timer = setTimeout(() => void this.save(), wait);
  }

  /** A blank map and no project, until something is drawn (^171, ^189). */
  private showBlank() {
    clearTimeout(this.timer);
    this.waitingSince = null;
    this.id = '';
    this.title = 'Untitled project';
    this.editor.load(emptyGraph());
    this.camera.restore(NEW_CAMERA);
    this.saved = this.editor.graph;
  }

  /** The new project button: save the open project, then there is no project (^171). With none, nothing changes. */
  async newProject() {
    if (this.id || this.hasData()) {
      await this.flush();
      this.showBlank();
      await this.refresh();
    }
    this.closeDialog();
  }

  /** A project made of a file (^164). */
  private async adopt(title: string, graph: Graph, camera: CameraState) {
    await this.flush();
    this.begin(title);
    this.editor.load(graph);
    this.camera.restore(camera);
    await this.save(false);
    await this.refresh();
  }

  async open(id: string) {
    if (id === this.id) {
      this.closeDialog();
      return;
    }
    const target = (await this.refresh()).find((p) => p.id === id);
    if (!target) return;
    await this.flush();
    this.show(target);
    this.closeDialog();
  }

  async remove(id: string) {
    await this.storage.remove(id);
    if (id !== this.id) {
      await this.refresh();
      return;
    }
    const rest = await this.refresh();
    if (rest[0]) this.show(rest[0]);
    else this.showBlank();
  }

  /** Open a project from the text of a file as a new project of the browser (^164). */
  async importText(text: string) {
    try {
      const p = fromFile(parseProject(text));
      await this.adopt(p.title, p.graph, p.camera);
      this.error = null;
      this.closeDialog();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    }
  }

  /** The projects the dialog shows: all, or those that fuzzily match the search (^178). */
  get shown(): StoredProject[] {
    return fuzzyFilter(this.projects, this.query, (p) => p.file.title);
  }

  startRename(id: string) {
    this.row = { id, mode: 'rename' };
  }

  startDelete(id: string) {
    this.row = { id, mode: 'delete' };
  }

  cancelRow() {
    this.row = null;
  }

  /** Give a project a new name (an empty one is refused) and save it at once. The date of the last change stays (^177). */
  async rename(id: string, title: string) {
    const name = title.trim().slice(0, MAX_TITLE);
    this.row = null;
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

  /** Let the user save the project as a file. */
  download() {
    const name =
      this.title
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '') || 'project';
    const url = URL.createObjectURL(new Blob([this.exportText()], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${name}.modelcity.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  async openDialog() {
    this.error = null;
    this.query = '';
    this.row = null;
    await this.flush();
    await this.refresh();
    this.dialogOpen = true;
  }

  closeDialog() {
    this.dialogOpen = false;
    this.row = null;
    this.over = null;
  }
}

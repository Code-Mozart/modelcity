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
  id = $state('');
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

  constructor(
    private editor: Editor,
    private camera: Camera,
    private storage: ProjectStorage,
    private now: () => string = () => new SvelteDate().toISOString(),
  ) {}

  /** Open the project that was open last, or the newest, or a new one. */
  async start() {
    const all = await this.refresh();
    const last = all.find((p) => p.id === lastId()) ?? all[0];
    if (last) this.show(last);
    else await this.create();
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

  /** Write the project to the browser now. Only a change of the map counts as an update, not a rename. */
  async save(touch = true) {
    clearTimeout(this.timer);
    if (!this.id) return;
    if (touch) this.lastUpdatedAt = this.now();
    this.saved = this.editor.graph;
    await this.storage.put({ id: this.id, file: toFile(this.project()) });
  }

  /** The graph may have changed (called whenever it does): save it after a short while, debounced (^166). Moving the camera alone does not. */
  changed() {
    if (!this.id || this.editor.graph === this.saved) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.save(), AUTOSAVE_MS);
  }

  /** A new, blank project (^171). The open one is saved first. */
  async create(title = 'Untitled project', graph: Graph = emptyGraph(), camera = NEW_CAMERA) {
    if (this.id) await this.save();
    const stamp = this.now();
    this.id = uid();
    [this.title, this.createdAt, this.lastUpdatedAt] = [title, stamp, stamp];
    this.editor.load(graph);
    this.camera.restore(camera);
    remember(this.id);
    await this.save();
    await this.refresh();
  }

  async open(id: string) {
    if (id === this.id) {
      this.dialogOpen = false;
      return;
    }
    const target = (await this.refresh()).find((p) => p.id === id);
    if (!target) return;
    await this.save();
    this.show(target);
    this.dialogOpen = false;
  }

  async remove(id: string) {
    await this.storage.remove(id);
    if (id !== this.id) {
      await this.refresh();
      return;
    }
    clearTimeout(this.timer);
    this.id = '';
    const rest = await this.refresh();
    if (rest[0]) this.show(rest[0]);
    else await this.create();
  }

  /** Open a project from the text of a file as a new project of the browser (^164). */
  async importText(text: string) {
    try {
      const p = fromFile(parseProject(text));
      await this.create(p.title, p.graph, p.camera);
      this.error = null;
      this.dialogOpen = false;
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
    this.lastUpdatedAt = this.lastUpdatedAt || this.now();
    return JSON.stringify(toFile(this.project()), null, 2);
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
    await this.refresh();
    this.dialogOpen = true;
  }

  closeDialog() {
    this.dialogOpen = false;
    this.row = null;
    this.over = null;
  }
}

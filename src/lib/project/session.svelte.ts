import { SvelteDate } from 'svelte/reactivity';
import type { Camera } from '../camera.svelte';
import type { Editor } from '../editor.svelte';
import { emptyGraph, type Graph } from '../model/graph';
import { fromFile, toFile, type CameraState, type Project } from './file';
import { parseProject } from './migrate';
import type { ProjectStorage, StoredProject } from './storage';

/** How long after a change the project is saved to the browser (^166). */
export const AUTOSAVE_MS = 400;
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

  /** Write the project to the browser now. */
  async save() {
    clearTimeout(this.timer);
    if (!this.id) return;
    this.lastUpdatedAt = this.now();
    this.saved = this.editor.graph;
    await this.storage.put({ id: this.id, file: toFile(this.project()) });
  }

  /** The graph may have changed (called whenever it does): save it after a short while (^166). Moving the camera alone does not. */
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
    const target = (await this.refresh()).find((p) => p.id === id);
    if (!target || id === this.id) return;
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
    await this.refresh();
    this.dialogOpen = true;
  }

  closeDialog() {
    this.dialogOpen = false;
  }
}

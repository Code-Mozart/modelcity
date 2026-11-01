import type { ProjectFile } from './file';

/** A project kept in the browser: the id of its record (not part of the file) and the project as in an export file (^165). */
export interface StoredProject {
  id: string;
  file: ProjectFile;
}

export interface ProjectStorage {
  list(): Promise<StoredProject[]>;
  put(project: StoredProject): Promise<void>;
  remove(id: string): Promise<void>;
}

const DB = 'modelcity';
const STORE = 'projects';

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

/** IndexedDB, one record per project. */
export class IndexedDbStorage implements ProjectStorage {
  private db: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const open = indexedDB.open(DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: 'id' });
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    return this.db;
  }

  private async store(mode: IDBTransactionMode) {
    return (await this.open()).transaction(STORE, mode).objectStore(STORE);
  }

  async list() {
    return request<StoredProject[]>((await this.store('readonly')).getAll());
  }

  async put(project: StoredProject) {
    await request((await this.store('readwrite')).put(project));
  }

  async remove(id: string) {
    await request((await this.store('readwrite')).delete(id));
  }
}

/** For tests, and for a browser without IndexedDB. */
export class MemoryStorage implements ProjectStorage {
  private items = new Map<string, StoredProject>();

  async list() {
    return [...this.items.values()];
  }

  async put(project: StoredProject) {
    this.items.set(project.id, structuredClone(project));
  }

  async remove(id: string) {
    this.items.delete(id);
  }
}

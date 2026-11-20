/// <reference lib="webworker" />
import { IndexedDbStorage } from '../project/indexedDb';
import { ProjectFileError } from '../project/file';
import { buildIndex } from './segmentIndex';

/** What the worker says to the page. */
export type WorkerSays =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done' }
  | { type: 'failed'; message: string; hat?: string; detail?: string };

/** The segment index of a project is built here, off the main thread (^1239): it is long, it reports how far it is, and the page stops it by ending the worker (what is written is whole pages, so a build goes on where it was). */
self.onmessage = async (e: MessageEvent<{ project: string }>) => {
  const say = (m: WorkerSays) => postMessage(m);
  try {
    await buildIndex(new IndexedDbStorage(), e.data.project, {
      onProgress: (done, total) => say({ type: 'progress', done, total }),
    });
    say({ type: 'done' });
  } catch (err) {
    const refusal = err instanceof ProjectFileError ? err : null;
    say({
      type: 'failed',
      message: refusal?.message ?? String(err),
      hat: refusal?.hat,
      detail: refusal?.detail,
    });
  }
};

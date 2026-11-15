import type { WorkerSays } from './indexWorker';

/** How a build is run: it reports how far it is, and stops when the signal says (by an `AbortError`). */
export type Runner = (
  project: string,
  run: { signal: AbortSignal; onProgress: (done: number, total: number) => void },
) => Promise<void>;

/** Build in a worker, so that the page stays free (^1239). */
export const workerRunner: Runner = (project, { signal, onProgress }) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./indexWorker.ts', import.meta.url), { type: 'module' });
    const end = () => worker.terminate();
    signal.addEventListener(
      'abort',
      () => {
        end();
        reject(signal.reason);
      },
      { once: true },
    );
    worker.onmessage = (e: MessageEvent<WorkerSays>) => {
      const says = e.data;
      if (says.type === 'progress') return onProgress(says.done, says.total);
      end();
      if (says.type === 'done') return resolve();
      console.error(
        `[modelcity] segment index failed (${says.hat ?? '-'}): ${says.detail ?? says.message}`,
      );
      reject(new Error(says.message));
    };
    worker.onerror = (e) => (end(), reject(new Error(e.message)));
    worker.postMessage({ project });
  });

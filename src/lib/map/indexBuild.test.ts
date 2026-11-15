import { describe, expect, it, vi } from 'vitest';
import type { ProjectFile } from '../project/file';
import { MemoryStorage, type EdgeRow, type NodeRow } from '../project/storage';
import { file } from '../testing/storageFixtures';
import { IndexBuild } from './indexBuild.svelte';
import type { Runner } from './workerRunner';
import { buildIndex, INDEX_VERSION, isComplete } from './segmentIndex';

const road = (): ProjectFile => ({
  ...file(),
  nodes: Array.from({ length: 1201 }, (_, i): NodeRow => [i, i * 40_000, 0, 0]),
  edges: Array.from({ length: 1200 }, (_, i): EdgeRow => [i, i, i + 1, null, 1]),
});

async function setup(run?: Runner) {
  const storage = new MemoryStorage();
  await storage.put({ id: 'p', file: road() });
  await storage.put({ id: 'q', file: road() });
  const direct: Runner = (project, { signal, onProgress }) =>
    buildIndex(storage, project, { signal, onProgress });
  return { storage, build: new IndexBuild(storage, run ?? direct) };
}

/** A build that never ends, and ends with an `AbortError` when it is stopped. */
const neverEnds: Runner = (_project, { signal }) =>
  new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));

describe('making sure the index is there before the map is shown (^1239)', () => {
  it('builds what is missing, with how far it is, and then the project is ready', async () => {
    const { build } = await setup();
    const states: string[] = [];
    const run = build.run;
    build.run = async (p, o) => (states.push(build.status), run(p, o));
    await build.ensure('p');
    expect(states).toEqual(['building']);
    expect(build.status).toBe('ready');
    expect([build.done, build.total]).toEqual([2401, 2401]);
  });

  it('only counts when the index is complete: it is trusted, nothing is built or looked at', async () => {
    const { storage, build } = await setup();
    await buildIndex(storage, 'p');
    const run = vi.fn(build.run);
    build.run = run;
    await build.ensure('p');
    expect(build.status).toBe('ready');
    expect(run).not.toHaveBeenCalled();
  });

  it('a build that is stopped leaves the project not ready, and goes on where it was', async () => {
    const { storage, build } = await setup((project, { signal, onProgress }) =>
      buildIndex(storage, project, {
        signal,
        onProgress: (d, t) => (onProgress(d, t), d > 0 && build.stop()),
      }),
    );
    await build.ensure('p');
    expect(build.status).toBe('stopped');
    expect(await isComplete(storage, 'p')).toBe(false);
    build.run = (project, run) => buildIndex(storage, project, run);
    await build.resume();
    expect(build.status).toBe('ready');
  });
});

describe('what goes wrong, and what is left (^1239)', () => {
  it('a build that fails says why, and can be tried again', async () => {
    const { build } = await setup(async () => {
      throw new Error('the storage is full');
    });
    await build.ensure('p');
    expect([build.status, build.error]).toEqual(['failed', 'the storage is full']);
  });

  it('opening another project stops the build of the first and checks the other', async () => {
    const { storage, build } = await setup(neverEnds);
    const first = build.ensure('p');
    await vi.waitFor(() => expect(build.status).toBe('building'));
    await buildIndex(storage, 'q');
    await build.ensure('q');
    await first;
    expect([build.project, build.status]).toEqual(['q', 'ready']);
  });
});

describe('no project, and a build from the ground up (^1239, ^1248)', () => {
  it('no project: nothing to build', async () => {
    const { build } = await setup();
    await build.ensure('');
    expect(build.status).toBe('none');
  });

  it('rebuilds from the nodes and segments alone: the index is thrown away first', async () => {
    const { storage, build } = await setup();
    await build.ensure('p');
    const cleared = vi.spyOn(storage, 'clearIndex');
    await build.rebuild();
    expect(cleared).toHaveBeenCalledWith('p');
    expect(build.status).toBe('ready');
    expect((await storage.indexStatus('p', INDEX_VERSION)).indexed).toBe(1200);
  });
});

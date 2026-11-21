import type { CDPSession, Page } from '@playwright/test';
import { mb, ms, stats } from './helpers';
import { mapSource } from './makeMap';

/** The steps of the measurement of the chunked map (^1249, ^1251), each in the page of the app. */

/** Import the map like a file, made in pieces as it is read (^1256): the time of the import, and of the build of the index. */
export async function importPhase(page: Page, nodes: number, spacing: number, scramble = false) {
  const done = await page.evaluate(
    async ({ make, count, space, mix }) => {
      const hook = window.__modelcity!;
      const pieces = (0, eval)(make)(count, space, mix) as Generator<string>;
      let chars = 0;
      async function* source() {
        for (const piece of pieces) {
          chars += piece.length;
          yield piece;
          // Let the page breathe: the log of the benchmark asks it how far it is.
          await new Promise((r) => setTimeout(r));
        }
      }
      const t0 = performance.now();
      await hook.session.importPieces(source());
      const t1 = performance.now();
      if (hook.session.error) throw new Error(`the import was refused: ${hook.session.error}`);
      while (hook.index.status !== 'ready') {
        if (hook.index.status === 'failed') throw new Error(hook.index.error ?? 'failed');
        await new Promise((r) => setTimeout(r, 50));
      }
      return { fileMb: chars / 1e6, importMs: t1 - t0, indexMs: performance.now() - t1 };
    },
    { make: mapSource(), count: nodes, space: spacing, mix: scramble },
  );
  return {
    fileMb: mb(done.fileMb * 1e6),
    importS: ms(done.importMs / 100) / 10,
    indexS: ms(done.indexMs / 100) / 10,
  };
}

export async function storageMb(page: Page) {
  return page.evaluate(
    async () => Math.round(((await navigator.storage.estimate()).usage ?? 0) / 1e5) / 10,
  );
}

export async function heapMb(client: CDPSession) {
  await client.send('HeapProfiler.collectGarbage');
  return mb((await client.send('Runtime.getHeapUsage')).usedSize);
}

type Marks = Record<'opened' | 'index' | 'chunks', number | undefined>;

/** Before the next load of the page: note when the app has opened the project, has its index complete, and has the chunks of the first view. */
async function noteTimes(page: Page) {
  await page.addInitScript(() => {
    const marks: Marks = { opened: undefined, index: undefined, chunks: undefined };
    (window as unknown as { marks: Marks }).marks = marks;
    const look = () => {
      const hook = window.__modelcity;
      const chunks = [...(hook?.memory.chunks.values() ?? [])];
      const done = {
        opened: hook?.session.ready === true,
        index: hook?.index.status === 'ready',
        chunks: chunks.length > 0 && chunks.every((c) => c.status === 'ready'),
      };
      for (const key of Object.keys(done) as (keyof Marks)[])
        if (done[key]) marks[key] ??= performance.now();
      if (marks.chunks === undefined) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
}

/** Open the project again: the time of the header, of the check of the index, and of the chunks of the first view. */
export async function openPhase(page: Page) {
  await noteTimes(page);
  await page.reload();
  await page.waitForFunction(
    () => (window as unknown as { marks: Marks }).marks.chunks !== undefined,
    undefined,
    {
      timeout: 30 * 60_000,
    },
  );
  const found = await page.evaluate(() => {
    const m = window.__modelcity!.memory;
    const marks = (window as unknown as { marks: Marks }).marks;
    return { marks, chunks: m.chunks.size, rows: m.loadedRows, reads: m.reads.map((r) => r.ms) };
  });
  return {
    openedMs: ms(found.marks.opened!),
    indexCheckedMs: ms(found.marks.index!),
    firstViewMs: ms(found.marks.chunks!),
    chunks: found.chunks,
    rows: found.rows,
    chunkReadMs: stats(found.reads),
  };
}

/** Frame times of a camera that `move` changes at every frame for `seconds`; and what was asked of the storage meanwhile. */
async function frames(
  page: Page,
  seconds: number,
  how: 'along' | 'pan' | 'zoom' | 'rotate',
  speed = 0,
) {
  return page.evaluate(
    async ({ total, what, metersPerSecond }) => {
      const hook = window.__modelcity!;
      const start = hook.camera();
      const times: number[] = [];
      const reads = hook.memory.reads.length;
      let last = performance.now();
      const began = last;
      await new Promise<void>((done) => {
        const step = (now: number) => {
          times.push(now - last);
          last = now;
          const t = (now - began) / 1000;
          const wave = Math.sin(t * 2);
          hook.show(
            {
              along: { ...start, x: start.x + t * metersPerSecond },
              pan: { ...start, x: start.x + 40 * wave },
              zoom: { ...start, scale: start.scale * (1 + 0.15 * wave) },
              rotate: { ...start, rotation: 0.4 * wave },
            }[what],
          );
          if (t < total) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      });
      return { times, newReads: hook.memory.reads.length - reads, rows: hook.memory.loadedRows };
    },
    { total: seconds, what: how, metersPerSecond: speed },
  );
}

function summary(f: Awaited<ReturnType<typeof frames>>, seconds: number) {
  const times = f.times.slice(5);
  return {
    framesPerSecond: Math.round(f.times.length / seconds),
    frameMs: stats(times),
    over17ms: times.filter((t) => t > 17).length,
    over7ms: times.filter((t) => t > 7).length,
    newChunkReads: f.newReads,
    loadedRows: f.rows,
  };
}

async function allLoaded(page: Page) {
  await page.waitForFunction(
    () => {
      const chunks = [...window.__modelcity!.memory.chunks.values()];
      return chunks.length > 0 && chunks.every((c) => c.status === 'ready');
    },
    undefined,
    { timeout: 30 * 60_000 },
  );
}

/** Pan along a row at a constant speed: chunks have to be read all the time. */
export async function loadingPanPhase(page: Page, seconds: number, metersPerSecond: number) {
  await allLoaded(page);
  const f = await frames(page, seconds, 'along', metersPerSecond);
  return { seconds, metersPerSecond, ...summary(f, seconds) };
}

/** Pan, zoom and rotate inside what is loaded. */
export async function establishedPhase(page: Page, seconds: number) {
  const out: Record<string, ReturnType<typeof summary>> = {};
  for (const how of ['pan', 'zoom', 'rotate'] as const) {
    await allLoaded(page);
    out[how] = summary(await frames(page, seconds, how), seconds);
  }
  return out;
}

/** Pan, zoom and rotate with every node that is loaded selected (^1257): what a frame costs with a large selection. */
export async function selectedPhase(page: Page, seconds: number) {
  await allLoaded(page);
  const selected = await page.evaluate(() => {
    const hook = window.__modelcity!;
    const ids: number[] = [];
    for (const state of hook.memory.chunks.values())
      if (state.status === 'ready') for (const n of state.chunk.nodes) ids.push(n[0]);
    hook.editor.select(new Set(ids));
    return ids.length;
  });
  const out: Record<string, ReturnType<typeof summary>> = {};
  for (const how of ['pan', 'zoom', 'rotate'] as const)
    out[how] = summary(await frames(page, seconds, how), seconds);
  return { selected, ...out };
}

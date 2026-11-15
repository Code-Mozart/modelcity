import { test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { App } from '../e2e/app';
import { importMap, mb, ms, profiled, stats } from './helpers';

/**
 * The chunked map on one big connected road network (^1249): import, build of the segment index,
 * opening, first paint, and panning, in a real browser on the production build.
 * `NODES=300000 bun run bench`; the result is written to `bench/out/` (not tracked).
 */
const NODES = Number(process.env.NODES ?? 100_000);
const SPACING_M = Number(process.env.SPACING ?? 40);
const PAN_SECONDS = Number(process.env.PAN_SECONDS ?? 10);
const PAN_M_PER_S = 300;

async function heapMb(client: CDPSession) {
  await client.send('HeapProfiler.collectGarbage');
  return mb((await client.send('Runtime.getHeapUsage')).usedSize);
}

type Marks = Record<'opened' | 'index' | 'chunks', number | undefined>;

/** Before the page loads: note when the app has opened the project, has its index complete, and has the chunks of the first view. */
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

async function firstView(page: Page) {
  await page.waitForFunction(
    () => (window as unknown as { marks: Marks }).marks.chunks !== undefined,
    undefined,
    {
      timeout: 300_000,
    },
  );
  const found = await page.evaluate(() => {
    const m = window.__modelcity!.memory;
    return {
      marks: (window as unknown as { marks: Marks }).marks,
      chunks: m.chunks.size,
      rows: m.loadedRows,
      reads: m.reads.map((r) => ({ ms: r.ms, rows: r.rows })),
    };
  });
  return {
    open: {
      opened: ms(found.marks.opened!),
      indexReady: ms(found.marks.index!),
      firstChunks: ms(found.marks.chunks!),
    },
    view: {
      chunks: found.chunks,
      rows: found.rows,
      readMs: stats(found.reads.map((r) => r.ms)),
      rowsPerChunk: stats(found.reads.map((r) => r.rows)),
    },
  };
}

/** Pan along a row at a constant speed: the time of each frame, and what was read on the way. */
async function pan(page: Page) {
  const found = await page.evaluate(
    async ({ seconds, speed }) => {
      const hook = window.__modelcity!;
      const start = hook.camera();
      const frames: number[] = [];
      let last = performance.now();
      const began = last;
      await new Promise<void>((done) => {
        const step = (now: number) => {
          frames.push(now - last);
          last = now;
          const t = (now - began) / 1000;
          hook.show({ ...start, x: start.x + t * speed });
          if (t < seconds) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      });
      const m = hook.memory;
      return {
        frames,
        ready: [...m.chunks.values()].filter((c) => c.status === 'ready').length,
        rows: m.loadedRows,
        reads: m.reads.map((r) => r.ms),
      };
    },
    { seconds: PAN_SECONDS, speed: PAN_M_PER_S },
  );
  return {
    seconds: PAN_SECONDS,
    metersPerSecond: PAN_M_PER_S,
    frameMs: stats(found.frames.slice(5)),
    framesOver17ms: found.frames.filter((f) => f > 17).length,
    framesOver50ms: found.frames.filter((f) => f > 50).length,
    loadedChunks: found.ready,
    loadedRows: found.rows,
    readMs: stats(found.reads),
  };
}

/** The pan, and with `PROFILE=1` the functions that took the most time while it went on. */
async function profiledPan(client: CDPSession, page: Page) {
  if (!process.env.PROFILE) return { pan: await pan(page), top: [] as string[] };
  let result: Awaited<ReturnType<typeof pan>> | undefined;
  const top = await profiled(client, async () => (result = await pan(page)));
  return { pan: result!, top };
}

test(`the chunked map with ${NODES} nodes`, async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await page.goto('./');
  await new App(page).ready();
  const imported = await importMap(page, NODES, SPACING_M);
  const storageMb = await page.evaluate(
    async () => Math.round(((await navigator.storage.estimate()).usage ?? 0) / 1e5) / 10,
  );
  await noteTimes(page);
  await page.reload();
  const first = await firstView(page);
  const heapAfterFirstViewMb = await heapMb(client);
  const profile = await profiledPan(client, page);
  const panned = profile.pan;
  const out = {
    nodes: NODES,
    spacing: SPACING_M,
    imported,
    storageMb,
    ...first,
    pan: panned,
    ...(profile.top.length ? { profile: profile.top } : {}),
    heapAfterFirstViewMb,
    heapAfterPanMb: await heapMb(client),
  };
  mkdirSync('bench/out', { recursive: true });
  writeFileSync(`bench/out/chunks-${NODES}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
});

import { test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { App } from '../e2e/app';

/**
 * The chunked map on one big connected road network (^1249): import, build of the segment index,
 * opening, first paint, and panning, in a real browser. `NODES=300000 bun run bench`. The map is
 * rows of straight roads (nodes 40 m apart, heading east) joined by S-curves at every 8th column,
 * so that it is one network with straight segments and curved ones.
 */
const NODES = Number(process.env.NODES ?? 100_000);
const SPACING_M = Number(process.env.SPACING ?? 40);
const PAN_SECONDS = Number(process.env.PAN_SECONDS ?? 10);

const ms = (n: number) => Math.round(n);
const mb = (bytes: number) => Math.round(bytes / 1e5) / 10;

async function heapMb(client: CDPSession) {
  await client.send('HeapProfiler.collectGarbage');
  const { usedSize } = await client.send('Runtime.getHeapUsage');
  return mb(usedSize);
}

/** Make the map in the page and import it like a file: the time of the import and of the build of the segment index. */
async function importMap(page: Page) {
  return page.evaluate(
    async ({ nodes, spacing }) => {
      const hook = window.__modelcity!;
      const cols = Math.ceil(Math.sqrt(nodes));
      const rows = Math.ceil(nodes / cols);
      const nodeRows: unknown[] = [];
      const edgeRows: unknown[] = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          nodeRows.push([r * cols + c, c * spacing * 1000, r * spacing * 1000, 0]);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const id = r * cols + c;
          if (c + 1 < cols) edgeRows.push([edgeRows.length, id, id + 1, null, 1]);
          if (c % 8 === 0 && r + 1 < rows) edgeRows.push([edgeRows.length, id, id + cols, null, 1]);
        }
      const text = JSON.stringify({
        version: 2,
        title: 'bench',
        createdAt: '2026-11-15T00:00:00Z',
        lastUpdatedAt: '2026-11-15T00:00:00Z',
        camera: {
          x: (cols / 2) * spacing * 1000,
          y: (rows / 2) * spacing * 1000,
          scale: 1,
          rotation: 0,
        },
        nodes: nodeRows,
        edges: edgeRows,
        laneConfigurations: { '1': { name: 'default', width: 3000 } },
        nextNodeId: nodeRows.length,
        nextEdgeId: edgeRows.length,
      });
      const t0 = performance.now();
      await hook.session.importText(text);
      const t1 = performance.now();
      while (hook.index.status !== 'ready') {
        if (hook.index.status === 'failed') throw new Error(hook.index.error ?? 'failed');
        await new Promise((r) => setTimeout(r, 25));
      }
      const t2 = performance.now();
      return {
        cols,
        rows,
        nodes: nodeRows.length,
        edges: edgeRows.length,
        fileMb: Math.round(text.length / 1e5) / 10,
        importMs: t1 - t0,
        indexMs: t2 - t1,
      };
    },
    { nodes: NODES, spacing: SPACING_M },
  );
}

/** The times, since the page began, when the app had opened the project, had its index complete, and had the chunks of the first view. */
async function marks(page: Page) {
  return page
    .waitForFunction(
      () => (window as unknown as { marks?: Record<string, number> }).marks?.chunks !== undefined,
    )
    .then(() =>
      page.evaluate(() => (window as unknown as { marks: Record<string, number> }).marks),
    );
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
  return { n: values.length, p50: at(0.5), p95: at(0.95), max: sorted.at(-1) ?? 0 };
}

test(`the chunked map with ${NODES} nodes`, async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  const out: Record<string, unknown> = { nodes: NODES, spacing: SPACING_M };
  await page.goto('/');
  await new App(page).ready();

  out.import = await importMap(page);
  out.storageMb = await page.evaluate(
    async () => Math.round(((await navigator.storage.estimate()).usage ?? 0) / 1e5) / 10,
  );

  // Opening the project again: the header only, the count of the index, the chunks of the first view.
  await page.addInitScript(() => {
    const marks: Record<string, number> = {};
    (window as unknown as { marks: typeof marks }).marks = marks;
    const look = () => {
      const hook = window.__modelcity;
      if (hook?.session.ready) marks.opened ??= performance.now();
      if (hook?.index.status === 'ready') marks.index ??= performance.now();
      const chunks = hook ? [...hook.memory.chunks.values()] : [];
      if (chunks.length && chunks.every((c) => c.status === 'ready'))
        marks.chunks ??= performance.now();
      if (marks.chunks === undefined) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
  await page.reload();
  const opened = await marks(page);
  out.open = {
    opened: ms(opened.opened!),
    indexReady: ms(opened.index!),
    firstChunks: ms(opened.chunks!),
  };
  const first = await page.evaluate(() => {
    const m = window.__modelcity!.memory;
    return {
      chunks: m.chunks.size,
      rows: m.loadedRows,
      reads: m.reads.map((r) => ({ ms: r.ms, rows: r.rows })),
    };
  });
  out.firstView = {
    chunks: first.chunks,
    rows: first.rows,
    readMs: stats(first.reads.map((r) => r.ms)),
    rowsPerChunk: stats(first.reads.map((r) => r.rows)),
  };
  out.heapAfterFirstViewMb = await heapMb(client);

  // Panning along a row at 300 m/s: frame times, and what is read on the way.
  const pan = await page.evaluate(async (seconds) => {
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
        hook.show({ ...start, x: start.x + t * 300 });
        if (t < seconds) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
    const m = hook.memory;
    return {
      frames,
      loadedChunks: [...m.chunks.values()].filter((c) => c.status === 'ready').length,
      loadedRows: m.loadedRows,
      reads: m.reads.map((r) => r.ms),
    };
  }, PAN_SECONDS);
  out.pan = {
    seconds: PAN_SECONDS,
    frameMs: stats(pan.frames.slice(5)),
    framesOver17ms: pan.frames.filter((f) => f > 17).length,
    framesOver50ms: pan.frames.filter((f) => f > 50).length,
    loadedChunks: pan.loadedChunks,
    loadedRows: pan.loadedRows,
    readMs: stats(pan.reads),
  };
  out.heapAfterPanMb = await heapMb(client);

  mkdirSync('bench/out', { recursive: true });
  writeFileSync(`bench/out/chunks-${NODES}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
});

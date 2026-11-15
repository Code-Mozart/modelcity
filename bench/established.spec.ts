import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { App } from '../e2e/app';
import { importMap, profiled, stats } from './helpers';

/**
 * The established view (^1251): after the chunks of the view are loaded, panning, zooming and
 * rotating inside them. The frame rate limit of the browser is lifted, so that the frame times say
 * how fast it can go, not what the screen shows (60 Hz). `NODES=100000 bunx playwright test -c
 * playwright.bench.config.ts bench/established.spec.ts`.
 */
const NODES = Number(process.env.NODES ?? 100_000);
const SECONDS = Number(process.env.SECONDS ?? 5);

test.use({
  launchOptions: {
    args: ['--enable-precise-memory-info', '--disable-frame-rate-limit', '--disable-gpu-vsync'],
  },
});

async function loaded(page: Page) {
  await page.waitForFunction(
    () => {
      const chunks = [...window.__modelcity!.memory.chunks.values()];
      return chunks.length > 0 && chunks.every((c) => c.status === 'ready');
    },
    undefined,
    { timeout: 300_000 },
  );
}

/** Frame times (ms) of a camera that `move` changes every frame, for `seconds`, and how many chunks were asked for meanwhile. */
async function frames(page: Page, kind: 'pan' | 'zoom' | 'rotate') {
  return page.evaluate(
    async ({ seconds, what }) => {
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
          const view = {
            pan: { ...start, x: start.x + 40 * wave },
            zoom: { ...start, scale: start.scale * (1 + 0.15 * wave) },
            rotate: { ...start, rotation: 0.4 * wave },
          }[what];
          hook.show(view);
          if (t < seconds) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      });
      return { times, newReads: hook.memory.reads.length - reads, rows: hook.memory.loadedRows };
    },
    { seconds: SECONDS, what: kind },
  );
}

test(`the established view of a map of ${NODES} nodes`, async ({ page }) => {
  await page.goto('./');
  await new App(page).ready();
  await importMap(page, NODES, 40);
  await page.reload();
  await new App(page).ready();
  await loaded(page);
  const out: Record<string, unknown> = { nodes: NODES };
  const client = await page.context().newCDPSession(page);
  for (const kind of ['pan', 'zoom', 'rotate'] as const) {
    await loaded(page);
    let f!: Awaited<ReturnType<typeof frames>>;
    const top = process.env.PROFILE
      ? await profiled(client, async () => (f = await frames(page, kind)))
      : [];
    if (!process.env.PROFILE) f = await frames(page, kind);
    const sorted = [...f.times.slice(5)].sort((a, b) => a - b);
    out[kind] = {
      frames: f.times.length,
      fps: Math.round(f.times.length / SECONDS),
      frameMs: stats(f.times.slice(5)),
      over17ms: sorted.filter((t) => t > 17).length,
      over7ms: sorted.filter((t) => t > 7).length,
      newChunkReads: f.newReads,
      loadedRows: f.rows,
      ...(top.length ? { profile: top } : {}),
    };
  }
  mkdirSync('bench/out', { recursive: true });
  writeFileSync(`bench/out/established-${NODES}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
});

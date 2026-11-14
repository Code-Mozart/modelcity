import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { App, type Pt } from './app';

const sample = readFileSync('src/lib/project/samples/v2.json', 'utf8');

/** The colour of the canvas at a world point, as `r,g,b`. */
const colourAt = (page: Page, pt: Pt) =>
  page.evaluate((p) => {
    const hook = window.__modelcity!;
    const canvas = document.querySelector('canvas')!;
    const page = hook.toPage(p);
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / rect.width;
    const data = canvas
      .getContext('2d')!
      .getImageData((page.x - rect.left) * ratio, (page.y - rect.top) * ratio, 1, 1).data;
    return `${data[0]},${data[1]},${data[2]}`;
  }, pt);

const INK = '21,23,28';
/** A node of the sample project: 100 m east of the origin. */
const NODE: Pt = { x: 100, y: 0 };

async function open(page: Page, latencyMs = 0) {
  await page.goto('/');
  await new App(page).ready();
  await page.evaluate((ms) => (window.__modelcity!.memory.latencyMs = ms), latencyMs);
  await page.evaluate((t) => window.__modelcity!.session.importText(t), sample);
}

test('the nodes of a project are drawn once their chunks are loaded', async ({ page }) => {
  await open(page);
  await page.waitForFunction(() => {
    const chunks = [...window.__modelcity!.memory.chunks.values()];
    return chunks.length > 0 && chunks.every((c) => c.status === 'ready');
  });
  expect(await colourAt(page, NODE)).toBe(INK);
  expect(await colourAt(page, { x: 100, y: 40 })).not.toBe(INK);
});

test('a chunk that is not loaded yet is hatched, and the camera is free meanwhile', async ({
  page,
}) => {
  await open(page, 60_000);
  await page.waitForFunction(() => window.__modelcity!.memory.chunks.size > 0);
  const states = await page.evaluate(() =>
    [...window.__modelcity!.memory.chunks.values()].map((c) => c.status),
  );
  expect(new Set(states)).toEqual(new Set(['loading']));
  // Half of the rows of the chunk in the middle are read: the ring is half full.
  await page.evaluate(() =>
    window.__modelcity!.memory.chunks.set('0,0', { status: 'loading', progress: 0.5 }),
  );
  expect(await colourAt(page, NODE)).not.toBe(INK);
  await page.screenshot({
    path: '/tmp/claude-0/-home-user-modelcity/4aaea4c7-3f8c-5912-8706-e9ae310b32b3/scratchpad/loading.png',
  });
  const before = await page.evaluate(() => window.__modelcity!.camera());
  await page.mouse.move(400, 300);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(520, 300, { steps: 4 });
  await page.mouse.up({ button: 'right' });
  const after = await page.evaluate(() => window.__modelcity!.camera());
  expect(after.x).not.toBe(before.x);
});

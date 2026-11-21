import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { App } from './app';

const sample = readFileSync('src/lib/project/samples/v2.json', 'utf8');

async function open(page: Page) {
  await page.goto('/');
  const app = new App(page);
  await app.ready();
  await page.evaluate((t) => window.__modelcity!.session.importText(t), sample);
  await page.evaluate(() => window.__modelcity!.show({ x: 220, y: 75, scale: 3, rotation: 0 }));
  await page.waitForFunction(() => {
    const chunks = [...window.__modelcity!.memory.chunks.values()];
    return chunks.length > 0 && chunks.every((c) => c.status === 'ready');
  });
  return app;
}

/** A stored node as `[x, y]` in millimeters. */
const at = (page: Page, id: number) =>
  page.evaluate(async (n) => {
    const f = JSON.parse(await window.__modelcity!.session.exportText()) as { nodes: number[][] };
    return f.nodes.find((r) => r[0] === n)?.slice(1, 3);
  }, id);
const idle = (page: Page) => page.waitForFunction(() => !window.__modelcity!.editor.busy);

test('a node is dragged to a new place, selected with it; Ctrl+Z puts it back', async ({
  page,
}) => {
  const app = await open(page);
  await app.drag({ x: 300, y: 150 }, { x: 330, y: 170 });
  await idle(page);
  expect(await at(page, 2)).toEqual([330_000, 170_000]);
  expect(await page.evaluate(() => [...window.__modelcity!.editor.selection])).toEqual([2]);
  await page.keyboard.press('Control+z');
  await idle(page);
  expect(await at(page, 2)).toEqual([300_000, 150_000]);
});

test('a node dragged onto another node merges into it', async ({ page }) => {
  const app = await open(page);
  await app.drag({ x: 300, y: 150 }, { x: 300, y: 50 });
  await idle(page);
  expect(await at(page, 2)).toBeUndefined();
  expect(await at(page, 1)).toEqual([300_000, 50_000]);
});

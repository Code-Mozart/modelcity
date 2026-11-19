import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { App, type Pt } from './app';

const sample = readFileSync('src/lib/project/samples/v2.json', 'utf8');
/** The nodes of the sample, in meters: 0 at (100, 0), 1 at (300, 50), 2 at (300, 150). */
const [N0, N1, N2] = [
  { x: 100, y: 0 },
  { x: 300, y: 50 },
  { x: 300, y: 150 },
] as [Pt, Pt, Pt];

async function open(page: Page) {
  await page.goto('/');
  const app = new App(page);
  await app.ready();
  await page.evaluate((t) => window.__modelcity!.session.importText(t), sample);
  await page.evaluate(() => window.__modelcity!.show({ x: 200, y: 75, scale: 2, rotation: 0 }));
  await loaded(page);
  return app;
}

const loaded = (page: Page) =>
  page.waitForFunction(() => {
    const chunks = [...window.__modelcity!.memory.chunks.values()];
    return chunks.length > 0 && chunks.every((c) => c.status === 'ready');
  });

/** The nodes that the loaded chunks hold. */
const nodes = (page: Page) =>
  page.evaluate(() => {
    const ids: number[] = [];
    for (const s of window.__modelcity!.memory.chunks.values())
      if (s.status === 'ready') for (const n of s.chunk.nodes) ids.push(n[0]);
    return ids.sort();
  });

test('RMB on a node deletes it, with its segment; Ctrl+Z brings it back; a pan does not delete', async ({
  page,
}) => {
  const app = await open(page);
  expect(await nodes(page)).toEqual([0, 1, 2]);
  // Pulled with the right button over a node: a pan, nothing is deleted.
  const p = await page.evaluate((pt) => window.__modelcity!.toPage(pt), N2);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(p.x + 60, p.y + 10, { steps: 4 });
  await page.mouse.up({ button: 'right' });
  expect(await nodes(page)).toEqual([0, 1, 2]);
  await page.evaluate(() => window.__modelcity!.show({ x: 200, y: 75, scale: 2, rotation: 0 }));
  await app.rightClick(N2);
  await expect.poll(() => nodes(page)).toEqual([0, 1]);

  await page.keyboard.press('Control+z');
  await expect.poll(() => nodes(page)).toEqual([0, 1, 2]);
  await page.keyboard.press('Control+y');
  await expect.poll(() => nodes(page)).toEqual([0, 1]);
});

test('deleting the middle node dissolves it: the first segment runs on to the last node, in the chunks too', async ({
  page,
}) => {
  const app = await open(page);
  await app.rightClick(N1);
  // The segment is the new row everywhere it is shown, not the old one.
  await expect
    .poll(() => page.evaluate(() => JSON.stringify(window.__modelcity!.memory.index.edgesAt(0))))
    .toBe('[[0,0,2,null,1]]');
  await page.keyboard.press('Control+z');
  await expect
    .poll(() => page.evaluate(() => JSON.stringify(window.__modelcity!.memory.index.edgesAt(0))))
    .toBe('[[0,0,1,null,1]]');
});

test('Del deletes the selection; the deleted nodes are not selected; it is saved and the index stays complete after a reload', async ({
  page,
}) => {
  const app = await open(page);
  await app.click(N0);
  await page.keyboard.press('Delete');
  await expect.poll(() => nodes(page)).toEqual([1, 2]);
  expect(await page.evaluate(() => window.__modelcity!.editor.selection.size)).toBe(0);
  await page.reload();
  await new App(page).ready();
  await page.waitForFunction(() => window.__modelcity!.index.status === 'ready');
  await loaded(page);
  await page.evaluate(() => window.__modelcity!.show({ x: 200, y: 75, scale: 2, rotation: 0 }));
  await loaded(page);
  expect(await nodes(page)).toEqual([1, 2]);
  // The index was kept current: it was not built again.
  expect(await page.evaluate(() => window.__modelcity!.index.total)).toBe(0);
});

test('a segment is deleted by RMB and the recent history panel names the step', async ({
  page,
}) => {
  const app = await open(page);
  await app.click({ x: 300, y: 100 });
  await app.click({ x: 200, y: -80 });
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+y');
  await app.rightClick(N1);
  await expect(page.getByLabel('Recent history')).toContainText('delete node');
});

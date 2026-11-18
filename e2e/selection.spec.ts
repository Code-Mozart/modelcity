import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { buildEdge } from '../src/lib/curves/edge';
import { pointOn } from '../src/lib/curves/piece';
import { App, type Pt } from './app';

const sample = readFileSync('src/lib/project/samples/v2.json', 'utf8');
/** The nodes of the sample, in meters: 0 at (100, 0), 1 at (300, 50), 2 at (300, 150). */
const [N0, N1, N2] = [
  { x: 100, y: 0 },
  { x: 300, y: 50 },
  { x: 300, y: 150 },
] as [Pt, Pt, Pt];

/** The middle of the second segment of the sample (a curve between its second and third node, radius 12.5 m). */
const MIDDLE = (() => {
  const piece = buildEdge({ x: 300, y: 50, th: 2.3 }, { x: 300, y: 150, th: 1.5708 }, 12.5)
    .pieces[0]!;
  const at = pointOn(piece, 0.5);
  return { x: at.x, y: at.y };
})();

async function open(page: Page) {
  await page.goto('/');
  const app = new App(page);
  await app.ready();
  await page.evaluate((t) => window.__modelcity!.session.importText(t), sample);
  await page.waitForFunction(() => {
    const chunks = [...window.__modelcity!.memory.chunks.values()];
    return chunks.length > 0 && chunks.every((c) => c.status === 'ready');
  });
  // All of the sample on the screen.
  await page.evaluate(() => window.__modelcity!.show({ x: 200, y: 75, scale: 2, rotation: 0 }));
  await page.waitForFunction(() => {
    const chunks = [...window.__modelcity!.memory.chunks.values()];
    return chunks.length > 0 && chunks.every((c) => c.status === 'ready');
  });
  return app;
}

const selected = (page: Page) =>
  page.evaluate(() => [...window.__modelcity!.editor.selection].sort());

test('a click selects a node, Shift adds one, a click on nothing deselects all, Esc and undo work', async ({
  page,
}) => {
  const app = await open(page);
  await app.click(N0);
  expect(await selected(page)).toEqual([0]);
  await page.keyboard.down('Shift');
  await app.click(N1);
  await page.keyboard.up('Shift');
  expect(await selected(page)).toEqual([0, 1]);
  await app.click({ x: 200, y: -80 });
  expect(await selected(page)).toEqual([]);
  await page.keyboard.press('Control+z');
  expect(await selected(page)).toEqual([0, 1]);
  await page.keyboard.press('Escape');
  expect(await selected(page)).toEqual([]);
});

test('a click on a segment selects its two nodes; a box selects the nodes inside it', async ({
  page,
}) => {
  const app = await open(page);
  await app.click(MIDDLE);
  expect(await selected(page)).toEqual([1, 2]);
  await app.click({ x: 200, y: -80 });
  await app.drag({ x: 250, y: 20 }, { x: 350, y: 180 });
  expect(await selected(page)).toEqual([1, 2]);
});

test('Tab goes to view mode, where a click selects nothing, and back', async ({ page }) => {
  const app = await open(page);
  const frame = page.getByTestId('mode-frame');
  await expect(frame).toHaveAttribute('data-mode', 'select');
  await page.keyboard.press('Tab');
  await expect(frame).toHaveAttribute('data-mode', 'view');
  await app.click(N0);
  expect(await selected(page)).toEqual([]);
  await page.keyboard.press('Tab');
  await app.click(N0);
  expect(await selected(page)).toEqual([0]);
});

test('a selected node is drawn as a ring, and the hint says what a click does', async ({
  page,
}) => {
  const app = await open(page);
  await app.click(N2);
  const blue = await page.evaluate((p) => {
    const hook = window.__modelcity!;
    const canvas = document.querySelector('canvas')!;
    const at = hook.toPage({ x: p.x, y: p.y });
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / rect.width;
    // The ring has a radius of 9 px: look to the right of the node's centre.
    const data = canvas
      .getContext('2d')!
      .getImageData((at.x - rect.left + 9) * ratio, (at.y - rect.top) * ratio, 1, 1).data;
    return [data[0], data[1], data[2]];
  }, N2);
  expect(blue[2]).toBeGreaterThan(blue[0]!);
  await expect(page.getByRole('list', { name: 'Controls' })).toContainText('deselect all');
});

test('Alt+click selects the whole branch, and the recent history panel shows the steps', async ({
  page,
}) => {
  const app = await open(page);
  await page.keyboard.down('Alt');
  await app.click(N0);
  await page.keyboard.up('Alt');
  expect(await selected(page)).toEqual([0, 1, 2]);
  const panel = page.getByLabel('Recent history');
  await expect(panel).toContainText('select 3 nodes');
  await expect(panel).toContainText('undo');
  await page.keyboard.press('Control+z');
  await expect(panel.locator('.undone')).toContainText('select 3 nodes');
  expect(await selected(page)).toEqual([]);
});

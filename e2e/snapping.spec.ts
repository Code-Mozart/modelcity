import { expect, test } from '@playwright/test';
import { App } from './app';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await new App(page).ready();
});

/** A road along the x axis, finished, and draw mode again. */
async function road(app: App) {
  await app.click({ x: 0, y: 30 });
  for (const x of [0, 30]) await app.click({ x, y: 0 });
  await app.rightClick({ x: 80, y: 80 });
}

const previewAt = (app: App) =>
  app.page.evaluate(() => {
    const h = window.__modelcity!.editor.hover;
    return h?.kind === 'preview' ? { x: h.node.x, y: h.node.y } : null;
  });

/** Snap lines and points (^101): a node is pulled to the line along the normal of a node, Ctrl turns it off. */
test('a placed node snaps to the snap line of a node, and Ctrl turns snapping off', async ({
  page,
}) => {
  const app = new App(page);
  await road(app);
  await app.hover({ x: 0.4, y: -25 });
  expect(await previewAt(app)).toMatchObject({ x: 0, y: -25 });
  await expect(app.hints()).toContainText('no snapping');
  await page.keyboard.down('Control');
  expect((await previewAt(app))!.x).toBeCloseTo(0.4, 2);
  await expect(app.hints()).not.toContainText('no snapping');
  await page.keyboard.up('Control');
});

test('S pins the suggestions of the selected nodes, and unpins', async ({ page }) => {
  const app = new App(page);
  await road(app);
  await page.keyboard.press('Escape');
  await app.click({ x: 0, y: 0 });
  await expect(app.hints()).toContainText('pin snap suggestions');
  await page.keyboard.press('s');
  expect(await page.evaluate(() => window.__modelcity!.editor.pins.list)).toEqual([0]);
  await app.click({ x: 40, y: 40 });
  await expect(app.hints()).toContainText('unpin all snap suggestions');
  await page.keyboard.press('s');
  expect(await page.evaluate(() => window.__modelcity!.editor.pins.list)).toEqual([]);
});

test('a node dropped on another node is merged into it', async ({ page }) => {
  const app = new App(page);
  await road(app);
  await page.keyboard.press('Escape');
  await app.drag({ x: 30, y: 0 }, { x: 0.3, y: 0.3 });
  expect(await app.nodes()).toHaveLength(0); // the only segment of the road went with it (^285)
});

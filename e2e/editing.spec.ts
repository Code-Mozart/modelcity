import { expect, test } from '@playwright/test';
import { App } from './app';

const nodes = (app: App) => app.nodes();

/** A straight road of three nodes along the x axis, finished with Escape. */
async function drawRoad(app: App) {
  await app.click({ x: 0, y: 30 }); // empty canvas: enters draw mode
  for (const x of [0, 30, 60]) await app.click({ x, y: 0 });
  await app.page.keyboard.press('Escape');
  expect(await nodes(app)).toHaveLength(3);
}

async function deleteNode(app: App) {
  await app.click({ x: 30, y: 0 }); // select the middle node
  await app.page.keyboard.press('Delete');
  expect(await nodes(app)).toHaveLength(2);
}

/** In draw mode a click on the end node of a road extends it; the end is at (60, 0). */
async function extendTo(app: App, pt: { x: number; y: number }) {
  await app.click({ x: 0, y: 30 }); // empty canvas: enters draw mode
  expect((await app.state()).mode).toBe('draw');
  await app.click({ x: 60, y: 0 });
  await app.click(pt);
  await app.page.keyboard.press('Escape');
  expect(await nodes(app)).toHaveLength(3);
}

async function rightClickNode(app: App) {
  await app.rightClick({ x: 60, y: 40 }); // RMB on a node removes it
  expect(await nodes(app)).toHaveLength(2);
}

async function moveGroup(app: App) {
  const before = await nodes(app);
  await app.box({ x: -20, y: -20 }, { x: 80, y: 60 }); // box select all three
  expect((await app.state()).selected).toBe(3);
  await app.drag({ x: 40, y: 40 }, { x: 50, y: 50 });
  const after = await nodes(app);
  for (const n of after) {
    const was = before.find((b) => b.id === n.id)!;
    expect(n.x - was.x).toBeCloseTo(10, 0);
    expect(n.y - was.y).toBeCloseTo(10, 0);
  }
}

test('delete, extend and move a group', async ({ page }) => {
  await page.goto('/');
  const app = new App(page);
  await app.ready();
  await test.step('draw a road', () => drawRoad(app));
  await test.step('delete the middle node', () => deleteNode(app));
  await test.step('extend the road', () => extendTo(app, { x: 60, y: 40 }));
  await test.step('remove a node with RMB', () => rightClickNode(app));
  await test.step('extend it again', () => extendTo(app, { x: 40, y: 40 }));
  await test.step('move a selected group', () => moveGroup(app));
});

/** Branches can form loops (^162): a click on the first node of the road being drawn closes it. */
test('close a loop', async ({ page }) => {
  await page.goto('/');
  const app = new App(page);
  await app.ready();
  await app.click({ x: 0, y: 30 }); // empty canvas: enters draw mode
  for (const [x, y] of [
    [0, 0],
    [40, 0],
    [40, 40],
  ] as const)
    await app.click({ x, y });
  const first = await app.node(0);
  expect(first).toMatchObject({ x: 0, y: 0 });
  await app.hover(first);
  await expect(app.hints()).toContainText('close');
  await app.click(first);
  expect((await app.state()).mode).toBe('select');
  const edges = await app.edges();
  expect(edges).toHaveLength(3);
  expect(edges.at(-1)).toMatchObject({ start: 2, end: 0 });
  expect((await app.nodes()).length).toBe(3);
});

test('the recent history panel shows the last steps, grays out undone ones and hides when idle (^107)', async ({
  page,
}) => {
  const app = new App(page);
  await page.goto('/');
  await app.ready();
  await drawRoad(app);
  await expect(app.history()).toContainText('finish road');
  for (const x of [0, 30, 60]) await app.click({ x, y: 0 });
  await expect(app.history()).toContainText('select node');
  // After the interval without an operation the whole panel goes, and comes back with the next one.
  await expect(app.history()).toHaveCount(0, { timeout: 6000 });
  await page.keyboard.press('Control+Alt+z');
  expect((await app.state()).selected).toBe(0);
  await expect(app.history().locator('.undone').first()).toContainText('select node');
  await expect(app.history()).toContainText('to redo batch');
  await page.keyboard.press('Control+Alt+Shift+z');
  expect((await app.state()).selected).toBe(1);
  await expect(app.history().locator('.undone')).toHaveCount(0);
});

test('a used control loses its hint, Esc deselects all, a right click removes a segment (^110, ^218, ^160)', async ({
  page,
}) => {
  const app = new App(page);
  await page.goto('/');
  await app.ready();
  await drawRoad(app);
  await expect(app.hints()).toContainText('zoom');
  await page.mouse.move(400, 300);
  await page.mouse.wheel(0, -120);
  await expect(app.hints()).not.toContainText('zoom');
  await expect(app.hints()).toContainText('pan');

  await app.box({ x: -10, y: -10 }, { x: 70, y: 10 });
  expect((await app.state()).selected).toBe(3);
  await expect(app.hints()).toContainText('deselect all');
  await page.keyboard.press('Escape');
  expect((await app.state()).selected).toBe(0);

  await app.rightClick({ x: 15, y: 0 });
  expect(await nodes(app)).toHaveLength(2);
  expect(await app.edges()).toHaveLength(1);
});

test('Alt and a click on a heading control point flips the arm; a split finished at once changes nothing (^234, ^237)', async ({
  page,
}) => {
  const app = new App(page);
  await page.goto('/');
  await app.ready();
  await drawRoad(app);
  const [first] = await app.edges();
  const tip = await app.headHandle(0);
  await page.keyboard.down('Alt');
  await app.click(tip);
  await page.keyboard.up('Alt');
  const [flipped] = await app.edges();
  expect([flipped!.start, flipped!.end]).toEqual([first!.end, first!.start]);
  await expect(app.history()).toContainText('flip arm');

  const before = (await app.graph()).edges.length;
  await app.click({ x: 0, y: 30 }); // empty canvas: draw mode
  await app.click(await app.curvePoint({ x: 15, y: 0 })); // a click on the curve: a split
  await page.keyboard.press('Escape');
  expect((await app.graph()).edges).toHaveLength(before);
});

test('the node just placed is hovered at once, and finishing a road takes the preview away (^238)', async ({
  page,
}) => {
  const app = new App(page);
  await page.goto('/');
  await app.ready();
  const hover = () => page.evaluate(() => window.__modelcity!.editor.hover?.kind ?? null);
  await app.click({ x: 0, y: 30 }); // empty canvas: draw mode
  await app.click({ x: 0, y: 0 });
  await app.click({ x: 30, y: 0 });
  expect(await hover()).toBe('handle'); // the node under the pointer, without moving it
  await app.hover({ x: 60, y: 20 });
  expect(await hover()).toBe('preview');
  await page.keyboard.press('Escape');
  expect(await hover()).toBeNull(); // no preview left in select mode
});

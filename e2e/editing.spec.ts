import { expect, test } from '@playwright/test';
import { App } from './app';

const nodes = async (app: App, road = 0) => (await app.roads())[road]!.nodes;

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
  after.forEach((n, i) => {
    expect(n.x - before[i]!.x).toBeCloseTo(10, 0);
    expect(n.y - before[i]!.y).toBeCloseTo(10, 0);
  });
}

test('delete, extend and move a group', async ({ page }) => {
  await page.goto('/');
  const app = new App(page);
  await test.step('draw a road', () => drawRoad(app));
  await test.step('delete the middle node', () => deleteNode(app));
  await test.step('extend the road', () => extendTo(app, { x: 60, y: 40 }));
  await test.step('remove a node with RMB', () => rightClickNode(app));
  await test.step('extend it again', () => extendTo(app, { x: 40, y: 40 }));
  await test.step('move a selected group', () => moveGroup(app));
});

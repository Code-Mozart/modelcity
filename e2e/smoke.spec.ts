import { expect, test } from '@playwright/test';
import { App } from './app';

const A = { x: 0, y: 0 };
const B = { x: 20, y: 10 };
const C = { x: 40, y: 40 };

/** The main editing features in one drive, as a user would do them (^145). */
async function firstArm(app: App) {
  await app.click({ x: 0, y: 30 }); // empty canvas: enters draw mode
  expect((await app.state()).mode).toBe('draw');
  await app.click(A);
  await app.drag(B, { x: 30, y: 10 }); // B with a heading: an S-curve
  await app.drag(C, { x: 40, y: 50 }); // C with a heading: an L-bend
  expect((await app.state()).kinds).toEqual([['S', 'C']]);
}

async function changeRadius(app: App) {
  expect((await app.edges())[1]!.radius).toBeNull();
  const handle = await app.radiusHandle(1);
  await app.drag(handle, { x: handle.x + 2, y: handle.y - 2 });
  expect((await app.edges())[1]!.radius).not.toBeNull();
}

async function moveUndoRedo(app: App) {
  await app.page.keyboard.press('Escape');
  expect((await app.state()).mode).toBe('select');
  await app.drag(B, { x: 25, y: 10 });
  expect((await app.node(1)).x).toBeCloseTo(25, 0);
  await expect(app.history()).toContainText('move node');
  await expect(app.history()).toContainText('undo');
  await app.page.keyboard.press('Control+z');
  expect((await app.node(1)).x).toBeCloseTo(20, 0);
  // The undone step stays in the panel, grayed out, and the redo hint appears.
  await expect(app.history().locator('.undone')).toContainText('move node');
  await expect(app.history()).toContainText('redo');
  await app.page.keyboard.press('Control+y');
  expect((await app.node(1)).x).toBeCloseTo(25, 0);
}

async function secondArm(app: App) {
  await app.click({ x: 0, y: -40 }); // empty canvas first clears the selection
  await app.click({ x: 0, y: -40 }); // then enters draw mode again
  expect((await app.state()).mode).toBe('draw');
  await app.click({ x: 10, y: -40 });
  await app.click({ x: 50, y: -40 });
  expect((await app.state()).kinds[1]).toEqual(['line']);
  await app.page.keyboard.press('Escape');
}

async function splitAndMerge(app: App) {
  await app.click({ x: 0, y: -60 }); // draw mode
  await app.click({ x: 30, y: -40 }); // curve of the second arm: split
  await app.click(await app.curvePoint({ x: 33, y: 10 })); // curve of the first arm: merge
  // five nodes of the arms, the node of the split, the node of the merge; the merge edge is the last
  const { nodes, edges } = await app.graph();
  expect(nodes).toHaveLength(7);
  expect(edges).toHaveLength(6);
  const end = nodes.find((n) => n.id === edges.at(-1)!.end)!;
  expect(Math.hypot(end.x - 32.4, end.y - 11.2)).toBeLessThan(1);
  expect((await app.state()).mode).toBe('select');
}

async function selectBranch(app: App) {
  const onBranch = await app.curvePoint({ x: 25, y: -20 });
  await app.page.keyboard.down('Alt');
  await app.click(onBranch);
  expect((await app.state()).selected).toBeGreaterThan(1);
  await app.click(onBranch); // the whole branch is selected: deselects it
  await app.page.keyboard.up('Alt');
  expect((await app.state()).selected).toBe(0);
}

test('draw, edit, undo, split, merge and select a branch', async ({ page }) => {
  await page.goto('/');
  const app = new App(page);
  await app.ready();
  await test.step('first arm A, B, C', () => firstArm(app));
  await test.step('radius of B-C', () => changeRadius(app));
  await test.step('move, undo, redo', () => moveUndoRedo(app));
  await test.step('second arm D, E', () => secondArm(app));
  await test.step('split and merge', () => splitAndMerge(app));
  await test.step('select a branch with Alt', () => selectBranch(app));
});

import { expect, test, type Page } from '@playwright/test';
import { App } from './app';
import { modalOf, otherProject, projectWithRoad } from './projects';

/** The camera of a project is saved with it and comes back (^236). */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await new App(page).ready();
});

const same = (a: Camera, b: Camera) => {
  expect(a.x).toBeCloseTo(b.x, 1);
  expect(a.y).toBeCloseTo(b.y, 1);
  expect(a.scale).toBeCloseTo(b.scale, 3);
};
type Camera = Awaited<ReturnType<App['camera']>>;

/** Two projects, each with a road and a camera of its own; the second one is open. */
async function twoProjects(page: Page, app: App) {
  await projectWithRoad(app, 1);
  await app.moveCamera(60, 40);
  const first = await app.camera();
  await page.keyboard.press('p');
  await modalOf(page).getByRole('button', { name: 'New project' }).click();
  await expect(modalOf(page)).toBeHidden();
  await projectWithRoad(app, 2);
  await app.moveCamera(-80, 10);
  return { first, second: await app.camera() };
}

test('each project keeps its own camera when another one is opened', async ({ page }) => {
  const app = new App(page);
  const { first, second } = await twoProjects(page, app);
  expect(second.x).not.toBeCloseTo(first.x, 0);
  await page.keyboard.press('p');
  await otherProject(page);
  await expect(modalOf(page)).toBeHidden();
  same(await app.camera(), first);
  await page.keyboard.press('p');
  await otherProject(page);
  await expect(modalOf(page)).toBeHidden();
  same(await app.camera(), second);
});

test('the camera of the open project is there after a reload (^236)', async ({ page }) => {
  const app = new App(page);
  const { second } = await twoProjects(page, app);
  // The camera is saved once it has rested; the app saves nothing else here.
  await expect
    .poll(async () => (await app.stored()).some((p) => Math.abs(p.camera.x - second.x * 1000) < 2))
    .toBe(true);
  await page.reload();
  await app.ready();
  same(await app.camera(), second);
});

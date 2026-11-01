import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { App } from './app';

/** Saving, exporting, importing and opening projects (^82, ^148, ^163 to ^168, ^171, ^189). */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await new App(page).ready();
});

const dialogOf = (page: Page) => page.getByRole('dialog', { name: 'Projects' });

/** Draw a road and wait until it is saved as the n-th project of the browser. */
async function projectWithRoad(app: App, count: number) {
  await app.drawRoad();
  await expect.poll(async () => (await app.stored()).length).toBe(count);
  await expect.poll(async () => (await app.stored()).every((p) => p.nodes.length === 2)).toBe(true);
}

test('there is no project at first, and the first road makes one that is there after a reload', async ({
  page,
}) => {
  const app = new App(page);
  expect(await app.stored()).toHaveLength(0);
  await page.keyboard.press('Control+o');
  const card = dialogOf(page).locator('li.current');
  await expect(card).toContainText('New project');
  await card.getByRole('button').click(); // the outlined card only closes the dialog
  await expect(dialogOf(page)).toBeHidden();
  expect(await app.stored()).toHaveLength(0);
  await projectWithRoad(app, 1);
  await page.reload();
  await expect.poll(async () => (await app.nodes()).length).toBe(2);
  expect(await app.edges()).toHaveLength(1);
});

test('the project controls are always shown', async ({ page }) => {
  const hints = new App(page).hints();
  await expect(hints).toContainText('export');
  await expect(hints).toContainText('projects');
});

test('Ctrl+S saves a file that Ctrl+O imports as a project', async ({ page }) => {
  const app = new App(page);
  await app.drawRoad();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.keyboard.press('Control+s'),
  ]);
  expect(download.suggestedFilename()).toBe('Untitled-project.modelcity.json');
  const path = (await download.path())!;
  expect(JSON.parse(readFileSync(path, 'utf8'))).toMatchObject({ version: 1 });

  await page.keyboard.press('Control+o');
  const dialog = dialogOf(page);
  await dialog.getByRole('button', { name: 'New project' }).click();
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(0);

  await page.keyboard.press('Control+o');
  await page.getByLabel('Project file').setInputFiles(path);
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(2);
  await expect.poll(async () => (await app.stored()).length).toBe(2);
});

test('the dialog has a Save to disc card, and dates like 2026-11-01 17:18:09', async ({ page }) => {
  const app = new App(page);
  await projectWithRoad(app, 1);
  await page.keyboard.press('Control+o');
  const dialog = dialogOf(page);
  await expect(dialog.locator('.date')).toHaveText(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Save to disc…' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('Untitled-project.modelcity.json');
});

test('Ctrl+O lists the projects, opens one and closes with Esc; opening does not change a date', async ({
  page,
}) => {
  const app = new App(page);
  await projectWithRoad(app, 1);
  const date = (await app.stored())[0]!.lastUpdatedAt;
  await page.keyboard.press('Control+o');
  const dialog = dialogOf(page);
  await dialog.getByRole('button', { name: 'New project' }).click();
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(0);

  await page.keyboard.press('Control+o');
  await expect(dialog.locator('li').filter({ has: page.locator('.open') })).toHaveCount(4);
  await dialog.locator('.open').first().click();
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(2);
  expect((await app.stored())[0]!.lastUpdatedAt).toBe(date);

  await page.keyboard.press('Control+o');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('a file that is no project is refused with a message, the open project stays', async ({
  page,
}) => {
  const app = new App(page);
  await app.drawRoad();
  await page.keyboard.press('Control+o');
  await page.getByLabel('Project file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version": 99}'),
  });
  await expect(page.getByRole('alert')).toContainText('newer version');
  expect(await app.nodes()).toHaveLength(2);
});

test('rename: the pen opens a text field, Enter renames, Esc cancels without closing', async ({
  page,
}) => {
  const app = new App(page);
  await projectWithRoad(app, 1);
  await page.keyboard.press('Control+o');
  const dialog = dialogOf(page);
  await dialog.getByRole('button', { name: /^Rename/ }).click();
  const name = dialog.getByLabel('Project name');
  await name.fill('Harbour');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(name).toBeHidden();
  await expect(dialog.getByText('Untitled project')).toBeVisible();
  await dialog.getByRole('button', { name: /^Rename/ }).click();
  await name.fill('Harbour');
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('Harbour')).toBeVisible();
  await expect.poll(async () => (await app.stored())[0]!.title).toBe('Harbour');
});

test('delete asks first: the bin turns into a cross, the pen into a check mark', async ({
  page,
}) => {
  const app = new App(page);
  await projectWithRoad(app, 1);
  await page.keyboard.press('Control+o');
  const dialog = dialogOf(page);
  await dialog.getByRole('button', { name: 'New project' }).click();
  await expect(dialog).toBeHidden();
  await projectWithRoad(app, 2);
  await page.keyboard.press('Control+o');
  await dialog
    .getByRole('button', { name: /^Delete/ })
    .first()
    .click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  expect(await app.stored()).toHaveLength(2);
  await dialog
    .getByRole('button', { name: /^Delete/ })
    .first()
    .click();
  await dialog.getByRole('button', { name: /^Confirm delete/ }).click();
  await expect.poll(async () => (await app.stored()).length).toBe(1);
});

test('the dialog shows its own controls only, one row for inputs that do the same, and searches', async ({
  page,
}) => {
  const app = new App(page);
  await projectWithRoad(app, 1);
  await page.keyboard.press('Control+o');
  const dialog = dialogOf(page);
  const hints = app.hints();
  await expect(hints).toContainText('close');
  await expect(hints).not.toContainText('open');
  await dialog.getByRole('button', { name: /^Rename/ }).hover();
  await expect(hints).toContainText('rename');
  await dialog.locator('.open').first().hover();
  await expect(hints).toContainText('open');
  await expect(hints).not.toContainText('pan');
  await dialog.getByRole('button', { name: 'Close' }).hover();
  await expect(hints.locator('li')).toHaveCount(1); // Esc or LMB: close
  await page.keyboard.type('zzz');
  await expect(dialog.getByText('No project matches.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(hints).toContainText('draw mode');
});

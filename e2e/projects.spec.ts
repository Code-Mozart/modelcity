import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { App } from './app';

/** Saving, exporting, importing and opening projects (^82, ^148, ^163 to ^168, ^171). */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => new App(page).stored().then((s) => s.length)).toBe(1);
});

test('a project is saved by itself and is there after a reload', async ({ page }) => {
  const app = new App(page);
  await app.drawRoad();
  await expect.poll(async () => (await app.stored())[0]!.nodes.length).toBe(2);
  await page.reload();
  await expect.poll(async () => (await app.nodes()).length).toBe(2);
  expect(await app.edges()).toHaveLength(1);
});

test('the project controls are always shown', async ({ page }) => {
  const hints = new App(page).hints();
  await expect(hints).toContainText('export');
  await expect(hints).toContainText('projects');
});

test('Ctrl+S exports a file that Ctrl+O imports as a new project', async ({ page }) => {
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
  const dialog = page.getByRole('dialog', { name: 'Projects' });
  await dialog.getByRole('button', { name: 'New project' }).click();
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(0);

  await page.keyboard.press('Control+o');
  await page.getByLabel('Project file').setInputFiles(path);
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(2);
  await expect.poll(async () => (await app.stored()).length).toBe(3);
});

test('Ctrl+O lists the projects, opens one and closes with Esc', async ({ page }) => {
  const app = new App(page);
  await app.drawRoad();
  await expect.poll(async () => (await app.stored())[0]!.nodes.length).toBe(2);
  await page.keyboard.press('Control+o');
  const dialog = page.getByRole('dialog', { name: 'Projects' });
  await dialog.getByRole('button', { name: 'New project' }).click();
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(0);

  await page.keyboard.press('Control+o');
  const rows = dialog.locator('li');
  await expect(rows).toHaveCount(2);
  await rows.nth(1).locator('.open').click(); // the older one, with the road
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(2);

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
  await page.keyboard.press('Control+o');
  const dialog = page.getByRole('dialog', { name: 'Projects' });
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
  await page.keyboard.press('Control+o');
  const dialog = page.getByRole('dialog', { name: 'Projects' });
  await dialog.getByRole('button', { name: 'New project' }).click();
  await expect(dialog).toBeHidden();
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

test('the dialog shows its own controls only, searches, and closes with the cross', async ({
  page,
}) => {
  await page.keyboard.press('Control+o');
  const dialog = page.getByRole('dialog', { name: 'Projects' });
  const hints = new App(page).hints();
  await expect(hints).toContainText('close');
  await expect(hints).not.toContainText('open project');
  await dialog.getByRole('button', { name: /^Rename/ }).hover();
  await expect(hints).toContainText('rename');
  await dialog.locator('.open').hover();
  await expect(hints).toContainText('open project');
  await expect(hints).not.toContainText('pan');
  await expect(hints).not.toContainText('select');
  await dialog.getByRole('button', { name: 'New project' }).click();
  await expect(dialog).toBeHidden();
  await page.keyboard.press('Control+o');
  await page.keyboard.type('zzz');
  await expect(dialog.getByText('No project matches.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(hints).toContainText('draw mode');
});

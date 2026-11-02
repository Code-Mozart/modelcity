import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { App } from './app';

/** Saving, exporting, importing and opening projects (^82, ^148, ^163 to ^168, ^171, ^189). */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await new App(page).ready();
});

const modalOf = (page: Page) => page.getByRole('dialog', { name: 'Projects' });

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
  await page.keyboard.press('p');
  const card = modalOf(page).locator('li.current');
  await expect(card).toContainText('New project');
  await card.getByRole('button').click(); // the outlined card only closes the modal
  await expect(modalOf(page)).toBeHidden();
  expect(await app.stored()).toHaveLength(0);
  await projectWithRoad(app, 1);
  await page.reload();
  await expect.poll(async () => (await app.nodes()).length).toBe(2);
  expect(await app.edges()).toHaveLength(1);
});

test('the project controls are always shown', async ({ page }) => {
  const hints = new App(page).hints();
  await expect(hints).toContainText('save');
  await expect(hints).toContainText('projects');
});

test('Ctrl+S saves and says so; the modal exports a file that Ctrl+O imports as a project', async ({
  page,
}) => {
  const app = new App(page);
  await app.drawRoad();
  await page.keyboard.press('Control+s');
  await expect(page.getByRole('list', { name: 'Messages' })).toContainText('saved');
  await expect.poll(async () => (await app.stored()).length).toBe(1);
  await page.keyboard.press('p');
  const dialog = modalOf(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Export JSON' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('Untitled-project.modelcity.json');
  const path = (await download.path())!;
  expect(JSON.parse(readFileSync(path, 'utf8'))).toMatchObject({ version: 1 });
  await dialog.getByRole('button', { name: 'New project' }).click();
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(0);

  // Ctrl+O opens the modal and the file window at once.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.keyboard.press('Control+o'),
  ]);
  await chooser.setFiles(path);
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(2);
  await expect.poll(async () => (await app.stored()).length).toBe(2);
});

test('the modal has an Export JSON card, the time since the change and a label for the open project', async ({
  page,
}) => {
  const app = new App(page);
  await projectWithRoad(app, 1);
  await page.keyboard.press('p');
  const dialog = modalOf(page);
  await expect(dialog.locator('.date')).toHaveText(
    /^(just now|\d+ seconds? ago|\d+ minutes? ago)$/,
  );
  await expect(dialog.locator('.date')).toHaveAttribute(
    'title',
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/,
  );
  await expect(dialog.locator('.label')).toHaveText('open');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Export JSON' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('Untitled-project.modelcity.json');
});

test('Ctrl+O lists the projects, opens one and closes with Esc; opening does not change a date', async ({
  page,
}) => {
  const app = new App(page);
  await projectWithRoad(app, 1);
  const date = (await app.stored())[0]!.lastUpdatedAt;
  await page.keyboard.press('p');
  const dialog = modalOf(page);
  await dialog.getByRole('button', { name: 'New project' }).click();
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(0);

  await page.keyboard.press('p');
  await expect(dialog.locator('li').filter({ has: page.locator('.open') })).toHaveCount(4);
  await dialog.locator('.open').first().click();
  await expect(dialog).toBeHidden();
  expect(await app.nodes()).toHaveLength(2);
  expect((await app.stored())[0]!.lastUpdatedAt).toBe(date);

  await page.keyboard.press('p');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('a file that is no project is refused with a message, the open project stays', async ({
  page,
}) => {
  const app = new App(page);
  await app.drawRoad();
  await page.keyboard.press('p');
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
  await page.keyboard.press('p');
  const dialog = modalOf(page);
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
  await page.keyboard.press('p');
  const dialog = modalOf(page);
  await dialog.getByRole('button', { name: 'New project' }).click();
  await expect(dialog).toBeHidden();
  await projectWithRoad(app, 2);
  await page.keyboard.press('p');
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

test('the modal shows its own controls only, one row for inputs that do the same, and searches', async ({
  page,
}) => {
  const app = new App(page);
  await projectWithRoad(app, 1);
  await page.keyboard.press('p');
  const dialog = modalOf(page);
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

test('the modal is wide, at most three quarters of the screen tall, and the file error has an icon', async ({
  page,
}) => {
  const app = new App(page);
  await projectWithRoad(app, 1);
  await page.keyboard.press('p');
  const box = (await modalOf(page).boundingBox())!;
  expect(box.width).toBeGreaterThan(600);
  expect(box.height).toBeLessThanOrEqual(0.75 * page.viewportSize()!.height);
  await page.getByLabel('Project file').setInputFiles({
    name: 'bad.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  });
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('This is not a modelcity project file.');
  await expect(alert.locator('svg')).toBeVisible();
});

test('the search finds fuzzily and says what a click does only while it is not the one typed in', async ({
  page,
}) => {
  const app = new App(page);
  await projectWithRoad(app, 1);
  await page.keyboard.press('p');
  const modal = modalOf(page);
  const search = modal.getByLabel('Search projects');
  await expect(search).toBeFocused();
  await search.hover();
  await expect(app.hints()).not.toContainText('search');
  await page.keyboard.type('utp'); // Untitled project
  await expect(modal.locator('.open').first()).toBeVisible();
  await modal.getByRole('heading', { name: 'Projects' }).click(); // leaves the field
  await search.hover();
  await expect(app.hints()).toContainText('search');
});

test('an error message takes its room from the list, the modal stays within three quarters of the screen', async ({
  page,
}) => {
  const app = new App(page);
  const file = JSON.stringify({
    version: 1,
    title: 'ATest',
    createdAt: '2026-10-01T19:02:41.454Z',
    lastUpdatedAt: '2026-10-12T19:06:18.603Z',
    camera: { x: 0, y: 0, scale: 1, rotation: 0 },
    nodes: [],
    edges: [],
    laneConfigurations: { '1': { name: 'default', width: 3000 } },
  });
  for (let i = 0; i < 14; i++) {
    await page.evaluate((text) => window.__modelcity!.session.importText(text), file);
  }
  await page.keyboard.press('p');
  const modal = modalOf(page);
  // an imported project keeps the dates of its file (^214)
  await expect(modal.locator('.date').first()).toHaveAttribute('title', /^2026-10-1[23]T/);
  const before = (await modal.boundingBox())!;
  await page.getByLabel('Project file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version": 99}'),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  const after = (await modal.boundingBox())!;
  const screen = page.viewportSize()!.height;
  expect(after.height).toBeLessThanOrEqual(0.75 * screen + 1);
  expect(after.y + after.height).toBeLessThan(screen);
  expect(before.height).toBeLessThanOrEqual(0.75 * screen + 1);
  await expect(modal.getByRole('button', { name: 'New project' })).toBeInViewport();
  void app;
});

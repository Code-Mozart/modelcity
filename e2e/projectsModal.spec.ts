import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { App } from './app';

const sample = readFileSync('src/lib/project/samples/v2.json', 'utf8');

/** The app with one project stored and the projects modal open. */
async function withModal(page: Page) {
  await page.goto('/');
  await new App(page).ready();
  await page.evaluate((t) => window.__modelcity!.session.importText(t), sample);
  await page.keyboard.press('p');
  await expect(page.getByRole('dialog')).toBeVisible();
}

const row = (page: Page) => page.evaluate(() => window.__modelcity!.session.row);

/** The hints of the modal say what `Esc` does (^407, ^773, ^736): each of them done in the real app. */
test.describe('Esc in the projects modal', () => {
  test('closes the modal from the list', async ({ page }) => {
    await withModal(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('closes the modal while a search is typed', async ({ page }) => {
    await withModal(page);
    await page.keyboard.type('sam');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('cancels a rename, and then closes the modal', async ({ page }) => {
    await withModal(page);
    await page
      .getByLabel(/^Rename/)
      .first()
      .click();
    await page.keyboard.press('Escape');
    expect(await row(page)).toBeNull();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('cancels the question about a delete, and then closes the modal', async ({ page }) => {
    await withModal(page);
    await page
      .getByLabel(/^Delete/)
      .first()
      .click();
    expect((await row(page))?.mode).toBe('delete');
    await page.keyboard.press('Escape');
    expect(await row(page)).toBeNull();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

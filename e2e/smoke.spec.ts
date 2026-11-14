import { expect, test } from '@playwright/test';
import { App } from './app';

test('the app opens an empty map: a canvas, the projects, no error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const app = new App(page);
  await app.ready();
  await expect(page.locator('canvas')).toBeVisible();
  expect(await app.nodes()).toEqual([]);
  const hints = await page.getByLabel('Controls').locator('li').allInnerTexts();
  expect(hints.map((h) => h.replace(/\s+/g, ' ').trim())).toEqual([
    'pan',
    'zoom',
    'rotate',
    'P projects',
  ]);
  expect(errors).toEqual([]);
});

import { expect, test } from '@playwright/test';
import { App } from './app';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await new App(page).ready();
});

/** The mode outline (^119) follow the three modes (^120). */
test('the outline follow select, draw and extend mode', async ({ page }) => {
  const app = new App(page);
  const frame = page.getByTestId('mode-frame');
  await expect(frame).toHaveAttribute('data-mode', 'select');

  await app.click({ x: 0, y: 30 });
  await expect(frame).toHaveAttribute('data-mode', 'draw');
  await app.click({ x: 0, y: 0 });
  await expect(frame).toHaveAttribute('data-mode', 'extend');

  await app.rightClick({ x: 50, y: 50 }); // finishing goes back to draw mode
  await expect(frame).toHaveAttribute('data-mode', 'draw');
  await app.rightClick({ x: 50, y: 50 });
  await expect(frame).toHaveAttribute('data-mode', 'select');
});

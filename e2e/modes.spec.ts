import { expect, test } from '@playwright/test';
import { App } from './app';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await new App(page).ready();
});

/** The mode outline and label (^119) follow the three modes (^120). */
test('the outline and label follow select, draw and extend mode', async ({ page }) => {
  const app = new App(page);
  const frame = page.getByTestId('mode-frame');
  const label = page.getByTestId('mode-label');
  await expect(frame).toHaveAttribute('data-mode', 'select');
  await expect(label).toHaveCount(0);

  await app.click({ x: 0, y: 30 });
  await expect(frame).toHaveAttribute('data-mode', 'draw');
  await expect(label).toHaveText('draw mode');
  await app.click({ x: 0, y: 0 });
  await expect(frame).toHaveAttribute('data-mode', 'extend');
  await expect(label).toHaveText('extend mode');
  await expect(label).toHaveCount(0); // gone after less than a second

  await app.rightClick({ x: 50, y: 50 }); // finishing goes back to draw mode
  await expect(frame).toHaveAttribute('data-mode', 'draw');
  await app.rightClick({ x: 50, y: 50 });
  await expect(frame).toHaveAttribute('data-mode', 'select');
});

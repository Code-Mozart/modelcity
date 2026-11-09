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

/** View mode (^104): Tab, an eye icon, no outline, no skeleton, no editing. */
test('Tab shows only the roads, and leaves again', async ({ page }) => {
  const app = new App(page);
  const frame = page.getByTestId('mode-frame');
  await app.click({ x: 0, y: 30 });
  await app.click({ x: 0, y: 0 });
  await app.drag({ x: 30, y: 0 }, { x: 50, y: -20 }); // the middle node turns a little: a node without an effect would dissolve (^829)
  await app.click({ x: 60, y: 0 });
  await expect(app.hints()).toContainText('view mode');
  await page.keyboard.press('Tab'); // from extend mode
  await expect(frame).toHaveAttribute('data-mode', 'view');
  await expect(frame).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
  expect(await app.nodes()).toHaveLength(3);
  await app.click({ x: 30, y: 0 }); // nothing happens
  expect((await app.state()).selected).toBe(0);
  await page.keyboard.press('Tab');
  await expect(frame).toHaveAttribute('data-mode', 'select');
});

/** Panning with the right button in draw mode: the preview stays at the pointer (^277). */
test('the preview follows the pointer while the map is panned', async ({ page }) => {
  await page.mouse.click(500, 350);
  await page.mouse.move(520, 360);
  await page.mouse.down({ button: 'right' });
  for (let i = 1; i <= 6; i++) await page.mouse.move(520 + i * 25, 360 + i * 10, { steps: 2 });
  const preview = await page.evaluate(() => {
    const h = window.__modelcity!.editor.hover;
    return h?.kind === 'preview' ? window.__modelcity!.toPage(h.node) : null;
  });
  await page.mouse.up({ button: 'right' });
  expect(preview?.x).toBeCloseTo(670, 0);
  expect(preview?.y).toBeCloseTo(420, 0);
});

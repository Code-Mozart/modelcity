import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { App } from './app';

const sample = readFileSync('src/lib/project/samples/v2.json', 'utf8');

/** The app with a build of the segment index that never finishes (and can be stopped), the sample then imported. */
async function slowBuild(page: Page) {
  await page.goto('/');
  await new App(page).ready();
  await page.evaluate(() => {
    window.__modelcity!.index.run = (_project, { signal, onProgress }) =>
      new Promise((_, reject) => {
        let done = 0;
        const timer = setInterval(() => onProgress(++done, 100), 30);
        signal.addEventListener('abort', () => (clearInterval(timer), reject(signal.reason)));
      });
  });
  await page.evaluate((t) => window.__modelcity!.session.importText(t), sample);
}

const status = (page: Page) => page.evaluate(() => window.__modelcity!.index.status);

test('the segment index is built before the map is shown, with how far it is, and can be stopped', async ({
  page,
}) => {
  await slowBuild(page);
  const panel = page.getByRole('status', { name: 'Segment index' });
  await expect(panel).toContainText('Building the segment index of “Sample of version 2”');
  await expect(panel).toContainText(/\d+ of 100 segments/);
  expect(await page.evaluate(() => window.__modelcity!.memory.chunks.size)).toBe(0);
  await panel.getByRole('button', { name: 'Cancel' }).click();
  await expect(panel).toContainText('is not complete');
  expect(await status(page)).toBe('stopped');
  expect(await page.evaluate(() => window.__modelcity!.memory.chunks.size)).toBe(0);
});

test('it goes on with the real build, and then the map is shown', async ({ page }) => {
  await slowBuild(page);
  await page
    .getByRole('status', { name: 'Segment index' })
    .getByRole('button', { name: 'Cancel' })
    .click();
  // The build in the worker (the one that ships).
  await page.reload();
  await new App(page).ready();
  await page.waitForFunction(() => window.__modelcity!.index.status === 'ready');
  await page.waitForFunction(() => {
    const chunks = [...window.__modelcity!.memory.chunks.values()];
    return chunks.length > 0 && chunks.every((c) => c.status === 'ready');
  });
  await expect(page.getByRole('status', { name: 'Segment index' })).toBeHidden();
});

test('Ctrl+Comma throws the index away and builds it again', async ({ page }) => {
  await page.goto('/');
  await new App(page).ready();
  await page.evaluate((t) => window.__modelcity!.session.importText(t), sample);
  await page.waitForFunction(() => window.__modelcity!.index.status === 'ready');
  await page.evaluate(() => {
    const index = window.__modelcity!.index;
    const run = index.run;
    (window as unknown as { builds: number }).builds = 0;
    index.run = (p, o) => ((window as unknown as { builds: number }).builds++, run(p, o));
  });
  await page.keyboard.press('Control+Comma');
  await page.waitForFunction(() => (window as unknown as { builds: number }).builds === 1);
  await page.waitForFunction(() => window.__modelcity!.index.status === 'ready');
  expect(await page.evaluate(() => window.__modelcity!.memory.project)).not.toBe('');
});

import { expect, test, type Page } from '@playwright/test';
import { App } from './app';

/** The rows of the open project as they are stored: ids of the nodes and the segments as `[id, start, end]`. */
const stored = (page: Page) =>
  page.evaluate(async () => {
    const hook = window.__modelcity!;
    const file = (await hook.session.exportText()) as string;
    const f = JSON.parse(file) as { nodes: number[][]; edges: number[][] };
    return {
      nodes: f.nodes.map((n) => n[0]).sort((a, b) => a - b),
      edges: f.edges.map((e) => e.slice(0, 3)).sort((a, b) => a[0]! - b[0]!),
    };
  });

const phase = (page: Page) => page.evaluate(() => window.__modelcity!.editor.phase);
const idle = (page: Page) => page.waitForFunction(() => !window.__modelcity!.editor.busy);

test('a road drawn on a blank map: draw mode, three nodes, finished with Esc, undone and done again', async ({
  page,
}) => {
  await page.goto('/');
  const app = new App(page);
  await app.ready();
  await page.evaluate(() => window.__modelcity!.show({ x: 0, y: 0, scale: 4, rotation: 0 }));
  await app.click({ x: -40, y: 0 });
  expect(await phase(page)).toBe('draw');
  await app.click({ x: -40, y: 0 });
  await idle(page);
  expect(await phase(page)).toBe('extend');
  await app.click({ x: 0, y: 0 });
  await idle(page);
  await app.click({ x: 40, y: 20 });
  await idle(page);
  expect(await stored(page)).toEqual({ nodes: [0, 1, 2], edges: [[0, 0, 1], [1, 1, 2]] });
  await page.keyboard.press('Escape');
  await idle(page);
  expect(await phase(page)).toBe('select');
  // Undo the finish: drawing again from the last node; undo a node: from the one before.
  await page.keyboard.press('Control+z');
  await idle(page);
  expect(await phase(page)).toBe('extend');
  await page.keyboard.press('Control+z');
  await idle(page);
  expect(await stored(page)).toEqual({ nodes: [0, 1], edges: [[0, 0, 1]] });
  expect(await page.evaluate(() => window.__modelcity!.editor.draw.active)).toBe(1);
  // The next node gets a new id: ids are never given twice.
  await app.click({ x: 40, y: -20 });
  await idle(page);
  expect(await stored(page)).toEqual({ nodes: [0, 1, 3], edges: [[0, 0, 1], [2, 1, 3]] });
});

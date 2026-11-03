import { expect, test } from '@playwright/test';
import { App } from './app';

/** Three bends: two parallel (concentric, lanes next to each other) of one size, and a lone one of another size (^343). */
const bends = {
  nodes: [
    { id: 0, x: 0, y: 0, th: 0 },
    { id: 1, x: 50, y: 30, th: Math.PI / 2 },
    { id: 2, x: 0, y: 3, th: 0 },
    { id: 3, x: 47, y: 30, th: Math.PI / 2 },
    { id: 4, x: -70, y: -20, th: 0 },
    { id: 5, x: -40, y: 10, th: Math.PI / 2 },
  ],
  edges: [
    { id: 0, start: 0, end: 1, radius: 20, lane: 1 },
    { id: 1, start: 2, end: 3, radius: 17, lane: 1 },
    { id: 2, start: 4, end: 5, radius: 10, lane: 1 },
  ],
};

test('the parallel segments stay concentric when the radius of a lone segment is dragged with all nodes selected (^343, ^324)', async ({
  page,
}) => {
  await page.goto('/');
  const app = new App(page);
  await app.ready();
  await page.evaluate((b) => {
    const e = window.__modelcity!.editor;
    e.load({ ...e.graph, nodes: b.nodes, edges: b.edges });
    e.selection = b.nodes.map((n) => n.id);
  }, bends);
  const before = await app.radiusHandle(2);
  await page.keyboard.down('Control'); // no snapping: the radius goes where it is dragged
  await app.drag(before, { x: before.x - 6, y: before.y + 6 });
  await page.keyboard.up('Control');
  const [a, b, c] = await app.edges();
  expect(c!.radius).not.toBe(10); // the lone segment changed
  // The two parallel ones keep their offset of one lane width: 20 and 17.
  const [ra, rb] = [a!.radius ?? Infinity, b!.radius ?? Infinity];
  expect(Math.abs(ra - rb)).toBeCloseTo(3, 1);
});

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

/** Two bends that run the same way and a third that runs back the other way, one lane width apart (^360). */
const bothWays = {
  nodes: [
    { id: 0, x: 0, y: 0, th: 0 },
    { id: 1, x: 50, y: 30, th: Math.PI / 2 },
    { id: 2, x: 0, y: 3, th: 0 },
    { id: 3, x: 47, y: 30, th: Math.PI / 2 },
    { id: 4, x: 53, y: 30, th: -Math.PI / 2 },
    { id: 5, x: 0, y: -3, th: Math.PI },
  ],
  edges: [
    { id: 0, start: 0, end: 1, radius: 20, lane: 1 },
    { id: 1, start: 2, end: 3, radius: 17, lane: 1 },
    { id: 2, start: 4, end: 5, radius: 23, lane: 1 },
  ],
};

test('the line through an end radius point crosses the lanes at that end, also for a lane running the other way (^360, ^344)', async ({
  page,
}) => {
  await page.goto('/');
  const app = new App(page);
  await app.ready();
  await page.evaluate((b) => {
    const e = window.__modelcity!.editor;
    e.load({ ...e.graph, nodes: b.nodes, edges: b.edges });
  }, bothWays);
  // The end point of the arc of the first lane where the straight piece ends: x = 30, y = 0.
  const end = await page.evaluate(() => {
    const hook = window.__modelcity!;
    const h = hook.editor
      .handles(hook.scale())
      .find((x) => x.type === 'rad' && x.id === 0 && x.t === 0)!;
    return { x: h.x, y: h.y };
  });
  const at = await page.evaluate((p) => window.__modelcity!.toPage(p), end);
  await page.mouse.move(at.x - 30, at.y - 30);
  await page.mouse.move(at.x, at.y, { steps: 4 });
  const tower = await page.evaluate(() => window.__modelcity!.tower());
  expect(tower).not.toBeNull();
  // Across the lanes at x = 30, from the lane that runs the other way (y = -3) to the one at y = 3 (and not along a diagonal).
  expect(tower!.p.x).toBeCloseTo(30, 1);
  expect(tower!.q.x).toBeCloseTo(30, 1);
  expect(Math.abs(tower!.p.y - tower!.q.y)).toBeCloseTo(6, 1);
  expect(tower!.others).toHaveLength(2);
});

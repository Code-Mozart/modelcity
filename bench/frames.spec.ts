import { test } from '@playwright/test';
import { angleGround } from '../src/lib/testing/angleGround';
import { tiledMap } from '../src/lib/testing/samples';
import { tGround } from '../src/lib/testing/tGround';
import type { Graph } from '../src/lib/model/graph';

/**
 * Frame times of the app in a real browser (^928): the sample maps, the camera panned over them
 * (the road must not be computed again for that) and the graph replaced by a changed copy (an edit:
 * everything derived is computed again). The median of the time to the second painted frame after.
 */
const MAPS = [
  { name: 'T ground (358 nodes)', graph: () => tGround() },
  { name: 'angle ground (648 nodes)', graph: () => angleGround() },
  { name: 'tiled map, 250 cells (3000 nodes)', graph: () => tiledMap(250) },
  { name: 'tiled map, 1000 cells (12000 nodes)', graph: () => tiledMap(1000) },
];

/** Runs in the page: the three times, in milliseconds. */
async function measure(g: Graph) {
  const hook = window.__modelcity!;
  function nextFrame() {
    return new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
  async function frames() {
    await nextFrame();
    await nextFrame();
  }
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  async function timed(step: (i: number) => void, n: number) {
    const times: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = performance.now();
      step(i);
      await frames();
      times.push(performance.now() - a);
    }
    return median(times);
  }
  hook.editor.graph = g;
  const base = hook.camera();
  hook.show({ ...base, scale: 3 });
  await frames();
  const first = await timed(() => (hook.editor.graph = { ...g }), 1);
  const pan = await timed(
    (i) => hook.show({ x: base.x + i * 2, y: base.y + i, scale: 3, rotation: 0 }),
    30,
  );
  const edit = await timed(() => (hook.editor.graph = { ...g, nodes: g.nodes.map(copy) }), 3);
  function copy<T extends object>(n: T) {
    return { ...n };
  }
  return { first, pan, edit };
}

test('frame times', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__modelcity?.session.ready);
  for (const map of MAPS) {
    const r = await page.evaluate(measure, map.graph());
    console.log(
      `${map.name}: first paint ${r.first.toFixed(0)} ms, pan ${r.pan.toFixed(0)} ms/frame (two frames: 33 ms is 60 FPS), edit ${r.edit.toFixed(0)} ms`,
    );
  }
});

import { test } from '@playwright/test';
import { tiledMap } from '../src/lib/testing/samples';

/** Where the time of an edit goes in the browser (^928): the CPU profile of replacing the graph of a map of 250 cells, the functions with the most time of their own. */
test('profile of an edit', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__modelcity?.session.ready);
  const graph = tiledMap(Number(process.env.CELLS ?? 120));
  await page.evaluate(async (g) => {
    window.__modelcity!.editor.graph = g;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, graph);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.start');
  await page.evaluate(async (g) => {
    window.__modelcity!.editor.graph = { ...g, nodes: g.nodes.map((n) => ({ ...n })) };
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, graph);
  const { profile } = (await cdp.send('Profiler.stop')) as { profile: { nodes: any[]; samples: number[]; timeDeltas: number[] } };
  const self = new Map<number, number>();
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)));
  const byName = new Map<string, number>();
  for (const n of profile.nodes) {
    const f = n.callFrame;
    const key = `${f.functionName || '(anonymous)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber}`;
    byName.set(key, (byName.get(key) ?? 0) + (self.get(n.id) ?? 0));
  }
  const top = [...byName].sort((a, b) => b[1] - a[1]).slice(0, 22);
  console.log(top.map(([k, us]) => `${(us / 1000).toFixed(0)} ms  ${k}`).join('\n'));
});

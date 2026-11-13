import { test } from '@playwright/test';
import { connectedMap, tiledMap } from '../src/lib/testing/samples';

interface Profile {
  nodes: {
    id: number;
    children?: number[];
    callFrame: { functionName: string; url: string; lineNumber: number };
  }[];
  samples: number[];
  timeDeltas: number[];
}

/** The functions with the most time of their own, as lines of text. */
function inclusiveOf(profile: Profile): string {
  const self = new Map<number, number>();
  profile.samples.forEach((id, i) =>
    self.set(id, (self.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)),
  );
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const total = new Map<number, number>();
  const walk = (id: number): number => {
    const n = byId.get(id)!;
    const t = (self.get(id) ?? 0) + (n.children ?? []).reduce((a, c) => a + walk(c), 0);
    total.set(id, t);
    return t;
  };
  if (profile.nodes.length) walk(profile.nodes[0]!.id);
  const byName = new Map<string, number>();
  for (const n of profile.nodes) {
    const f = n.callFrame;
    if (!f.url.includes('/src/')) continue;
    const key = `${f.functionName || '(anonymous)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber}`;
    byName.set(key, Math.max(byName.get(key) ?? 0, total.get(n.id) ?? 0));
  }
  return [...byName]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([k, us]) => `${(us / 1000).toFixed(0)} ms total  ${k}`)
    .join('\n');
}

function topOf(profile: Profile): string {
  const self = new Map<number, number>();
  profile.samples.forEach((id, i) =>
    self.set(id, (self.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)),
  );
  const byName = new Map<string, number>();
  for (const n of profile.nodes) {
    const f = n.callFrame;
    const key = `${f.functionName || '(anonymous)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber}`;
    byName.set(key, (byName.get(key) ?? 0) + (self.get(n.id) ?? 0));
  }
  const top = [...byName].sort((a, b) => b[1] - a[1]).slice(0, 22);
  return top.map(([k, us]) => `${(us / 1000).toFixed(0)} ms  ${k}`).join('\n');
}

/** Where the time of an edit goes in the browser (^928): the CPU profile of replacing the graph of a map of 250 cells, the functions with the most time of their own. */
test('profile of an edit', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__modelcity?.session.ready);
  const graph = (process.env.MAP === 'connected' ? connectedMap : tiledMap)(
    Number(process.env.CELLS ?? 120),
  );
  await page.evaluate(async (g) => {
    window.__modelcity!.editor.graph = g;
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
  }, graph);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.start');
  if (process.env.PAN) {
    await page.evaluate(async () => {
      const hook = window.__modelcity!;
      const base = hook.camera();
      for (let i = 0; i < 20; i++) {
        hook.show({ x: base.x + i * 2, y: base.y + i, scale: 3, rotation: 0 });
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
      }
    });
  } else {
    await page.evaluate(async (g) => {
      const cur = window.__modelcity!.editor.graph;
      const mid = Math.floor(cur.nodes.length / 2);
      window.__modelcity!.editor.graph = {
        ...cur,
        nodes: cur.nodes.map((n, k) => (k === mid ? { ...n, x: n.x + 0.5 } : n)),
      };
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
    }, graph);
  }
  const { profile } = (await cdp.send('Profiler.stop')) as {
    profile: {
      nodes: { id: number; callFrame: { functionName: string; url: string; lineNumber: number } }[];
      samples: number[];
      timeDeltas: number[];
    };
  };
  console.log(`${topOf(profile)}\nINCLUSIVE\n${inclusiveOf(profile)}`);
});

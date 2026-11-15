import type { CDPSession, Page } from '@playwright/test';
import { makeMapText } from './makeMap';

export const ms = (n: number) => Math.round(n);
export const mb = (bytes: number) => Math.round(bytes / 1e5) / 10;

export function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
  return {
    n: values.length,
    p50: ms(at(0.5) * 10) / 10,
    p95: ms(at(0.95) * 10) / 10,
    max: ms(sorted.at(-1) ?? 0),
  };
}

/** Import the map like a file: the time of the import, and of the build of the index. */
export async function importMap(page: Page, nodes: number, spacing: number) {
  return page.evaluate(
    async ({ make, count, space }) => {
      const hook = window.__modelcity!;
      const text = (0, eval)(`(${make})`)(count, space) as string;
      const t0 = performance.now();
      await hook.session.importText(text);
      const t1 = performance.now();
      while (hook.index.status !== 'ready') {
        if (hook.index.status === 'failed') throw new Error(hook.index.error ?? 'failed');
        await new Promise((r) => setTimeout(r, 25));
      }
      return { fileMb: text.length / 1e6, importMs: t1 - t0, indexMs: performance.now() - t1 };
    },
    { make: makeMapText.toString(), count: nodes, space: spacing },
  );
}

/** The functions with the most time of their own in what `run` does on the main thread (`PROFILE=1`). */
export async function profiled(client: CDPSession, run: () => Promise<unknown>) {
  await client.send('Profiler.enable');
  await client.send('Profiler.start');
  await run();
  const { profile } = await client.send('Profiler.stop');
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map<string, number>();
  profile.samples?.forEach((id, i) => {
    const frame = byId.get(id)!.callFrame;
    const key = `${frame.functionName || '(anonymous)'} ${frame.url.split('/').pop()}:${frame.lineNumber}`;
    self.set(key, (self.get(key) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000);
  });
  return [...self.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([k, v]) => `${ms(v)} ms ${k}`);
}

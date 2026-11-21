import type { Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';

/**
 * The log of a run (^1256): every line goes to the screen and, at once, to `bench/out/progress-*.log`,
 * so that a run that hangs shows where. While a run goes, `watch` asks the page every few seconds
 * how far it is (the import, the index, the chunks, the memory) and says so when the page does not
 * answer.
 */
export function openLog(stamp: string) {
  mkdirSync('bench/out', { recursive: true });
  const file = `bench/out/progress-${stamp}.log`;
  const started = Date.now();
  const say = (text: string) => {
    const t = Math.round((Date.now() - started) / 1000);
    const line = `[bench ${new Date().toLocaleTimeString()} +${t}s] ${text}`;
    console.log(line);
    appendFileSync(file, `${line}\n`);
  };
  return { say, file, watch: (page: Page, label: string) => watch(page, label, say) };
}

const EVERY_MS = 5000;
const ANSWER_MS = 4000;

type Look = {
  importing: { nodes: number; edges: number } | null;
  index: { status: string; done: number; total: number };
  chunks: number;
  loading: number;
  rows: number;
  heapMb: number | null;
};

/** What the page can say about how far it is (null while the app is not there yet). */
const look = (): Look | null => {
  const hook = window.__modelcity;
  if (!hook) return null;
  const chunks = [...hook.memory.chunks.values()];
  const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return {
    importing: hook.session.importing,
    index: { status: hook.index.status, done: hook.index.done, total: hook.index.total },
    chunks: chunks.length,
    loading: chunks.filter((c) => c.status === 'loading').length,
    rows: hook.memory.loadedRows,
    heapMb: heap ? Math.round(heap.usedJSHeapSize / 1e6) : null,
  };
};

const n = (v: number) => v.toLocaleString('en');

const describe = (l: Look) =>
  [
    l.importing && `import ${n(l.importing.nodes)} nodes ${n(l.importing.edges)} segments`,
    l.index.status !== 'none' && `index ${l.index.status} ${n(l.index.done)}/${n(l.index.total)}`,
    l.chunks > 0 && `chunks ${l.chunks - l.loading}/${l.chunks} (${n(l.rows)} rows)`,
    l.heapMb !== null && `heap ${l.heapMb} MB`,
  ]
    .filter(Boolean)
    .join(', ') || 'idle';

function watch(page: Page, label: string, say: (text: string) => void) {
  page.on('pageerror', (e) => say(`${label}: ERROR in the page: ${e.message}`));
  page.on('crash', () => say(`${label}: THE PAGE CRASHED (out of memory?)`));
  page.on('close', () => say(`${label}: the page was closed`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[modelcity]'))
      say(`${label}: console ${m.type()}: ${m.text().slice(0, 300)}`);
  });
  let silent = 0;
  let last = '';
  const timer = setInterval(() => {
    void (async () => {
      const answer = await Promise.race([
        page.evaluate(look).catch(() => null),
        new Promise<null>((r) => setTimeout(() => r(null), ANSWER_MS)),
      ]);
      if (!answer) {
        silent += EVERY_MS / 1000;
        if (silent % 15 < EVERY_MS / 1000)
          say(`${label}: the page does not answer (for ${silent} s); it is busy or stuck`);
        return;
      }
      silent = 0;
      const now = describe(answer);
      if (now !== last) say(`${label}: ${now}`);
      last = now;
    })();
  }, EVERY_MS);
  return () => clearInterval(timer);
}

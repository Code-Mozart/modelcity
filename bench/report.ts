import { execSync } from 'node:child_process';
import os from 'node:os';
import type { Page } from '@playwright/test';

/** What the report says about the machine, the browser and the version of the app, so that numbers from two machines can be told apart. */
export async function machineInfo(page: Page, headless: boolean) {
  const browser = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGb: (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null,
      gpu: gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown',
      devicePixelRatio: window.devicePixelRatio,
    };
  });
  const git = (() => {
    try {
      return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  })();
  return {
    ...browser,
    headless,
    os: `${os.platform()} ${os.release()}`,
    cpu: `${os.cpus()[0]?.model ?? 'unknown'} x ${os.cpus().length}`,
    ramGb: Math.round(os.totalmem() / 1e9),
    commit: git,
    date: new Date().toISOString(),
  };
}

export type Machine = Awaited<ReturnType<typeof machineInfo>>;
export interface SizeResult {
  nodes: number;
  error?: string;
  [part: string]: unknown;
}

const get = (o: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], o);

/** The lines of the table: what is measured, where it is in a result, and what it is called. */
const ROWS: [string, string][] = [
  ['Import of the file (s)', 'import.importS'],
  ['Build of the index (s)', 'import.indexS'],
  ['File (MB)', 'import.fileMb'],
  ['Storage used (MB)', 'storageMb'],
  ['Open: header read (ms)', 'open.openedMs'],
  ['Open: index checked (ms)', 'open.indexCheckedMs'],
  ['First view: all chunks loaded (ms)', 'open.firstViewMs'],
  ['Chunks in the first view', 'open.chunks'],
  ['Rows in the first view', 'open.rows'],
  ['Read of one chunk: median (ms)', 'open.chunkReadMs.p50'],
  ['Read of one chunk: 95th (ms)', 'open.chunkReadMs.p95'],
  ['Pan along a row, chunks loading: frames per second', 'loadingPan.framesPerSecond'],
  ['... median frame (ms)', 'loadingPan.frameMs.p50'],
  ['... 95th percentile frame (ms)', 'loadingPan.frameMs.p95'],
  ['... worst frame (ms)', 'loadingPan.frameMs.max'],
  ['... frames over 17 ms', 'loadingPan.over17ms'],
  ['Established view, pan: frames per second', 'established.pan.framesPerSecond'],
  ['... median / 95th percentile frame (ms)', 'established.pan.frameMs'],
  ['Established view, zoom: frames per second', 'established.zoom.framesPerSecond'],
  ['Established view, rotate: frames per second', 'established.rotate.framesPerSecond'],
  ['Rows in view while panning', 'established.pan.loadedRows'],
  ['With the loaded nodes selected: how many', 'selected.selected'],
  ['... pan: frames per second', 'selected.pan.framesPerSecond'],
  ['... zoom: frames per second', 'selected.zoom.framesPerSecond'],
  ['... rotate: frames per second', 'selected.rotate.framesPerSecond'],
  ['JS heap after the first view (MB)', 'heapAfterFirstViewMb'],
  ['JS heap at the end (MB)', 'heapAtEndMb'],
];

const cell = (r: SizeResult, path: string) => {
  const v = get(r, path) as unknown;
  if (v && typeof v === 'object' && 'p50' in v)
    return `${(v as { p50: number }).p50} / ${(v as { p95: number }).p95}`;
  return v === undefined ? '-' : String(v);
};

/** The report as text to send: the machine, then one column for each size of map. */
export function markdown(machine: Machine, results: SizeResult[]): string {
  const head = `| | ${results.map((r) => r.nodes.toLocaleString('en')).join(' | ')} |\n|---|${results.map(() => '---').join('|')}|`;
  const rows = ROWS.map(
    ([name, path]) => `| ${name} | ${results.map((r) => cell(r, path)).join(' | ')} |`,
  );
  const errors = results
    .filter((r) => r.error)
    .map((r) => `- ${r.nodes.toLocaleString('en')} nodes: ${r.error}`);
  return [
    '# modelcity: the chunked map, measured',
    '',
    `- App: commit ${machine.commit}, ${machine.date}`,
    `- Machine: ${machine.os}, ${machine.cpu}, ${machine.ramGb} GB RAM`,
    `- Browser: ${machine.userAgent}${machine.headless ? ' (headless)' : ''}`,
    `- GPU: ${machine.gpu}, device pixel ratio ${machine.devicePixelRatio}`,
    '- The map: one connected road network, a single component (checked for every size by `src/lib/testing/benchMap.test.ts`): rows of straight roads joined by S-curves, one-way segments.',
    '- The frame rate limit of the browser is lifted: the frame times say how fast it can go, not what the screen shows.',
    '',
    head,
    ...rows,
    ...(errors.length ? ['', '## What went wrong', ...errors] : []),
    '',
  ].join('\n');
}

import { chromium, test, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  establishedPhase,
  heapMb,
  importPhase,
  loadingPanPhase,
  openPhase,
  storageMb,
} from './phases';
import { machineInfo, markdown, type Machine, type SizeResult } from './report';

/**
 * The chunked map on one big connected road network, at the sizes in `SIZES`, in a real browser on
 * the production build (^1249, ^1251): import, build of the index, opening, the first view, panning
 * while chunks are read, and panning, zooming and rotating inside what is loaded. The report is
 * written to `bench/out/report-*.md` (and `.json`) after each size, to send. See `bench/README.md`.
 */
const SIZES = (process.env.SIZES ?? '100000,300000').split(',').map((n) => Number(n.trim()));
const SPACING_M = Number(process.env.SPACING ?? 40);
const PAN_SECONDS = Number(process.env.PAN_SECONDS ?? 10);
const ESTABLISHED_SECONDS = Number(process.env.ESTABLISHED_SECONDS ?? 5);
const PAN_M_PER_S = 300;
/** Headless Chromium paints in software: on a machine with a screen the window is shown (`HEADLESS=1` for the other). */
const HEADLESS = process.env.HEADLESS === '1';
const URL = process.env.BENCH_URL ?? 'http://localhost:4174/modelcity/';
const ARGS = [
  '--enable-precise-memory-info',
  '--disable-frame-rate-limit',
  '--disable-gpu-vsync',
  '--enable-gpu-rasterization',
  '--ignore-gpu-blocklist',
];

const say = (text: string) => console.log(`[bench ${new Date().toLocaleTimeString()}] ${text}`);

/** The steps of one size of map, each saved into `result` as it is done (so that a failure in the middle keeps what came before). */
async function steps(context: BrowserContext, page: Page, nodes: number, result: SizeResult) {
  await page.goto(URL);
  await page.waitForFunction(() => window.__modelcity?.session.ready, undefined, {
    timeout: 60_000,
  });
  const client = await context.newCDPSession(page);
  say(`${nodes}: import (the longest part)`);
  result.import = await importPhase(page, nodes, SPACING_M);
  result.storageMb = await storageMb(page);
  say(`${nodes}: open and first view`);
  result.open = await openPhase(page);
  result.heapAfterFirstViewMb = await heapMb(client);
  say(`${nodes}: pan with chunks loading`);
  result.loadingPan = await loadingPanPhase(page, PAN_SECONDS, PAN_M_PER_S);
  say(`${nodes}: established view`);
  result.established = await establishedPhase(page, ESTABLISHED_SECONDS);
  result.heapAtEndMb = await heapMb(client);
}

async function measure(nodes: number): Promise<{ result: SizeResult; machine: Machine | null }> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'modelcity-bench-'));
  const context = await chromium.launchPersistentContext(dir, {
    headless: HEADLESS,
    args: ARGS,
    viewport: { width: 1200, height: 800 },
  });
  const page = context.pages()[0] ?? (await context.newPage());
  const result: SizeResult = { nodes };
  await steps(context, page, nodes, result).catch((e: unknown) => {
    result.error = e instanceof Error ? e.message.split('\n')[0] : String(e);
    say(`${nodes}: failed: ${result.error}`);
  });
  const machine = await machineInfo(page, HEADLESS).catch(() => null);
  await context.close();
  rmSync(dir, { recursive: true, force: true });
  return { result, machine };
}

test(`the chunked map at ${SIZES.join(', ')} nodes`, async () => {
  test.setTimeout(0);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const results: SizeResult[] = [];
  let machine: Machine | null = null;
  mkdirSync('bench/out', { recursive: true });
  for (const nodes of SIZES) {
    const done = await measure(nodes);
    results.push(done.result);
    machine = done.machine ?? machine;
    if (!machine) continue;
    writeFileSync(`bench/out/report-${stamp}.json`, JSON.stringify({ machine, results }, null, 2));
    writeFileSync(`bench/out/report-${stamp}.md`, markdown(machine, results));
    say(`${nodes}: done, the report so far is in bench/out/report-${stamp}.md`);
  }
  if (machine) console.log(`\n${markdown(machine, results)}\nSend bench/out/report-${stamp}.md`);
});

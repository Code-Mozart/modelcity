import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';
import type { Rec } from '../src/lib/testing/controlsMatrix';
import '../src/lib/testHook';

/**
 * Two screenshots of the editor for every row of the controls table in `docs/controls.md` (^371): one
 * with the pointer in place (the hints say what the input does), one after the input. The files are
 * named by the hat of the row (`hat779-before.png`), and `index.html` lists the rows with their
 * pictures. It runs on your machine, not in CI; the pictures are not committed.
 *
 *   bun run screenshots                  all rows (about 200: takes a few minutes)
 *   bun run screenshots --limit 3        the first rows only
 *   bun run screenshots --hat ^779       one row (more: repeat the flag)
 */
const OUT = 'screenshots/out';
const URL = 'http://localhost:5173';
const KEYS: Record<string, string[]> = {
  none: [],
  Alt: ['Alt'],
  Shift: ['Shift'],
  Ctrl: ['Control'],
  'Alt+Shift': ['Alt', 'Shift'],
};

interface Item {
  cells: string[];
  example: Rec;
}
interface Shot extends Item {
  hat: string;
}

const args = process.argv.slice(2);
const flag = (name: string) => args.flatMap((a, i) => (a === name ? [args[i + 1]!] : []));
const [limit] = flag('--limit');
const only = flag('--hat').map((h) => h.replace('^', '').replace('hat', ''));

/** The hat of each row of the generated table: the table is the one that has the hats. */
function hatsOfTable(): Map<string, string> {
  const doc = readFileSync('docs/controls.md', 'utf8');
  const start = doc.indexOf('## Controls by combination');
  const table = doc.slice(start, doc.indexOf('\n## ', start + 1));
  const hats = new Map<string, string>();
  for (const m of table.matchAll(/^\| (?:= )?\^(\d+) \| (.*) \|$/gm)) hats.set(m[2]!, m[1]!);
  return hats;
}

function rowsToShoot(): Shot[] {
  const made = spawnSync('bunx', ['vitest', 'run', 'src/lib/testing/controlsMatrix.test.ts'], {
    env: { ...process.env, CONTROLS_MATRIX_OUT: OUT },
    stdio: 'inherit',
  });
  if (made.status !== 0) throw new Error('the matrix did not run');
  const items: Item[] = JSON.parse(readFileSync(`${OUT}/rows.json`, 'utf8'));
  const hats = hatsOfTable();
  const shots = items.map((i) => ({ ...i, hat: hats.get(i.cells.join(' | ')) ?? '' }));
  const missing = shots.filter((s) => !s.hat);
  if (missing.length) {
    console.warn(`${missing.length} rows are not in docs/controls.md (is the table up to date?)`);
  }
  const chosen = shots.filter((s) => s.hat && (!only.length || only.includes(s.hat)));
  return limit ? chosen.slice(0, Number(limit)) : chosen;
}

async function serverUp(): Promise<boolean> {
  return fetch(URL).then(
    (r) => r.ok,
    () => false,
  );
}

/** The dev server, started if it is not running; the stop function is returned. */
async function devServer(): Promise<() => void> {
  if (await serverUp()) return () => {};
  const child = spawn('bun', ['run', 'dev'], { stdio: 'ignore' });
  for (let i = 0; i < 60 && !(await serverUp()); i++) await new Promise((r) => setTimeout(r, 500));
  return () => child.kill();
}

type World = { x: number; y: number };
const pagePoint = (page: Page, p: World) => page.evaluate((w) => window.__modelcity!.toPage(w), p);

/** The editor as the try had it: the project, the mode, the pins, the selection. */
async function setUp(page: Page, project: string, r: Rec) {
  await page.goto(URL);
  await page.waitForFunction(() => window.__modelcity?.session.ready);
  await page.evaluate(async (text) => window.__modelcity!.session.importText(text), project);
  await page.evaluate((pins) => window.__modelcity!.editor.pins.set(pins), r.pinned);
  if (r.mode !== 'select') await page.evaluate(() => window.__modelcity!.editor.enterDrawMode());
  if (r.mode === 'extend') {
    const n = await page.evaluate(() => {
      const e = window.__modelcity!.editor;
      return e.graph.nodes.find((x) => x.id === 1)!;
    });
    const p = await pagePoint(page, n);
    await page.keyboard.down('Control');
    await page.mouse.click(p.x, p.y);
    await page.keyboard.up('Control');
  }
  await page.evaluate((sel) => (window.__modelcity!.editor.selection = sel), r.selBefore);
}

const shoot = async (page: Page, hat: string, when: string) => {
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/hat${hat}-${when}.png` });
};

/** Do the input of the try; the first picture is taken just before it takes effect, the second after. */
async function perform(page: Page, hat: string, r: Rec) {
  const [from, step] = [await pagePoint(page, r.at), { x: r.at.x + 7, y: r.at.y + 5 }];
  const end = await pagePoint(page, r.dragTo ?? { x: r.at.x + 12, y: r.at.y + 9 });
  await page.mouse.move(from.x, from.y);
  if (r.action === 'drag') {
    await page.mouse.down();
    const mid = await pagePoint(page, step);
    await page.mouse.move(mid.x, mid.y);
    await page.mouse.move(end.x, end.y);
  }
  await shoot(page, hat, 'before');
  if (r.action === 'drag') await page.mouse.up();
  if (r.action === 'click') await page.mouse.click(from.x, from.y);
  if (r.action === 'rmb') await page.mouse.click(from.x, from.y, { button: 'right' });
  if (r.action === 'esc') await page.keyboard.press('Escape');
  await shoot(page, hat, 'after');
}

async function shootRow(page: Page, project: string, s: Shot) {
  await setUp(page, project, s.example);
  const keys = KEYS[s.example.mod] ?? [];
  for (const k of keys) await page.keyboard.down(k);
  await perform(page, s.hat, s.example);
  for (const k of keys) await page.keyboard.up(k);
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function indexHtml(shots: Shot[]): string {
  const head = ['Hat', 'Mode', 'Under the pointer', 'Context', 'Input', 'Says', 'Does'];
  const line = (s: Shot) => {
    const pics = ['before', 'after']
      .map(
        (w) => `<a href="hat${s.hat}-${w}.png"><img loading="lazy" src="hat${s.hat}-${w}.png"></a>`,
      )
      .join('');
    const cells = s.cells.slice(0, 6).map((c) => `<td>${esc(c)}</td>`);
    return `<tr><td>^${s.hat}</td>${cells.join('')}<td class="pics">${pics}</td></tr>`;
  };
  return `<!doctype html><meta charset="utf-8"><title>Controls</title>
<style>body{font:13px sans-serif}td,th{border:1px solid #ccc;padding:4px;vertical-align:top}
table{border-collapse:collapse}img{width:420px;margin:2px}.pics{white-space:nowrap}</style>
<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}<th>Before / after</th></tr>
${shots.map(line).join('\n')}</table>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const project = readFileSync('src/lib/testing/fixtures/combinations.json', 'utf8');
  const shots = rowsToShoot();
  const stop = await devServer();
  const browser = await chromium.launch();
  const page = await (
    await browser.newContext({ viewport: { width: 1200, height: 800 } })
  ).newPage();
  for (const s of shots) {
    await shootRow(page, project, s);
    console.log(`^${s.hat}`);
  }
  await browser.close();
  stop();
  writeFileSync(`${OUT}/index.html`, indexHtml(shots));
  console.log(`${shots.length} rows: ${OUT}/index.html`);
}

void main();

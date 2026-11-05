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
 *   bun run screenshots --html-only      only write index.html again (no browser, no new pictures)
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
const htmlOnly = args.includes('--html-only');
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
  const made = htmlOnly
    ? { status: 0 }
    : spawnSync('bunx', ['vitest', 'run', 'src/lib/testing/controlsMatrix.test.ts'], {
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

const PAGE_STYLE = `body{margin:0;font:14px sans-serif;height:100vh;display:flex;flex-direction:column}
#head{padding:6px 10px;border-bottom:1px solid #ccc}#pics{flex:1;display:flex;gap:4px;min-height:0;padding:4px}
#pics div{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center}
#pics img{max-width:100%;min-height:0;flex:1;object-fit:contain}
#foot{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-top:1px solid #ccc}
button{font-size:16px;padding:6px 14px}.on-a{background:#9d9}.on-r{background:#e99}
table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px;vertical-align:top}.rej{background:#fdd}`;

/** The review page: one row at a time with its two pictures, accepted or rejected; at the end a table. */
const PAGE_SCRIPT = `
const rows = ROWS, key = 'modelcity-review';
let state = {}; try { state = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
let i = 0;
const $ = (id) => document.getElementById(id);
const save = () => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} };
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function show() {
  if (i >= rows.length) return summary();
  const r = rows[i];
  $('head').innerHTML = '<b>' + (i + 1) + ' / ' + rows.length + ' ^' + r.hat + '</b> | ' + r.cells.slice(0, 6).map(esc).join(' | ');
  $('pics').innerHTML = ['before', 'after'].map((w) => '<div>' + w + '<img src="hat' + r.hat + '-' + w + '.png"></div>').join('');
  $('acc').className = state[r.hat] === 'accepted' ? 'on-a' : '';
  $('rej').className = state[r.hat] === 'rejected' ? 'on-r' : '';
}
function set(v) { state[rows[i].hat] = v; save(); i++; show(); }
function summary() {
  document.body.innerHTML = '<div style="padding:10px"><table><tr><th>Hat</th><th>State</th>' + ['Mode', 'Under the pointer', 'Context', 'Input', 'Says', 'Does'].map((h) => '<th>' + h + '</th>').join('') + '</tr>' +
    rows.map((r) => '<tr class="' + (state[r.hat] === 'rejected' ? 'rej' : '') + '"><td>^' + r.hat + '</td><td>' + (state[r.hat] || 'not reviewed') + '</td>' + r.cells.slice(0, 6).map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</table></div>';
  const bad = rows.filter((r) => state[r.hat] === 'rejected');
  console.log('Rejected rows (' + bad.length + '):\\n' + bad.map((r) => '^' + r.hat + ' | ' + r.cells.slice(0, 6).join(' | ')).join('\\n'));
}
$('acc').onclick = () => set('accepted'); $('rej').onclick = () => set('rejected');
$('prev').onclick = () => { i = Math.max(0, i - 1); show(); }; $('next').onclick = () => { i++; show(); };
show();`;

function indexHtml(shots: Shot[]): string {
  const rows = JSON.stringify(shots.map((s) => ({ hat: s.hat, cells: s.cells }))).replace(
    /</g,
    '\\u003c',
  );
  return `<!doctype html><meta charset="utf-8"><title>Controls</title><style>${PAGE_STYLE}</style>
<div id="head"></div><div id="pics"></div>
<div id="foot"><button id="prev">&larr; back</button><span><button id="rej">reject</button> <button id="acc">accept</button></span><button id="next">skip &rarr;</button></div>
<script>${PAGE_SCRIPT.replace('ROWS', rows)}</script>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const project = readFileSync('src/lib/testing/fixtures/combinations.json', 'utf8');
  const shots = rowsToShoot();
  if (htmlOnly) {
    writeFileSync(`${OUT}/index.html`, indexHtml(shots));
    console.log(`${shots.length} rows: ${OUT}/index.html`);
    return;
  }
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

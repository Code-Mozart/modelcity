/**
 * Pixel identity of what the app paints (^930): the same views of the testing grounds and of a
 * tiled map, painted by the app of the base branch (`origin/main` unless a ref is given) and by
 * this one, compared byte for byte. `bun run identity [ref]`. The canvas itself is read (not the
 * page), so the version banner is not in it. Each picture is of a view of a ground with the logical
 * markings, with the debug layer on, and some in the physical markings; besides the views of the
 * cases there are views that cut a cell in half and one of the whole ground (so that culling of
 * what is off the screen shows if it were wrong). Exits with 1 and writes both pictures of each
 * difference to `identity-out/` (not tracked).
 */
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { chromium, type Page } from 'playwright';
import { GROUND_CASES, junctionGround } from '../src/lib/testing/junctionGround';
import { PRIORITY_CASES, priorityGround } from '../src/lib/testing/priorityGround';
import { ANGLE_CASES, angleGround } from '../src/lib/testing/angleGround';
import { T_CASES, tGround } from '../src/lib/testing/tGround';
import { tiledMap } from '../src/lib/testing/samples';
import type { Graph } from '../src/lib/model/graph';
import { scenes } from './identityScenes';

interface View {
  name: string;
  x: number;
  y: number;
  span: number;
  mode: 'logical' | 'debug' | 'physical';
}

const WIDTH = 1200;
const base = process.argv[2] ?? 'origin/main';
const BASE_DIR = '/tmp/claude-0/identity-base';
const OUT = 'identity-out';

interface Ground {
  name: string;
  graph: Graph;
  cases: { hat: number; views: { center: { x: number; y: number }; span: number }[] }[];
}

const grounds: Ground[] = [
  { name: 'junctions', graph: junctionGround(), cases: GROUND_CASES },
  { name: 'priority', graph: priorityGround(), cases: PRIORITY_CASES },
  { name: 'tGround', graph: tGround(), cases: T_CASES },
  { name: 'angles', graph: angleGround(), cases: ANGLE_CASES },
];

/** The views of a ground: each case in the logical markings and the debug layer, every third in the physical ones, half a cell off, and the whole ground. */
function viewsOf(g: Ground): View[] {
  const views: View[] = [];
  g.cases.forEach((c, i) => {
    const [v] = c.views;
    if (!v) return;
    const at = { x: v.center.x, y: v.center.y };
    views.push({ name: `${g.name}-${c.hat}-logical`, ...at, span: v.span, mode: 'logical' });
    views.push({ name: `${g.name}-${c.hat}-debug`, ...at, span: v.span, mode: 'debug' });
    if (i % 3 === 0)
      views.push({ name: `${g.name}-${c.hat}-physical`, ...at, span: v.span, mode: 'physical' });
    views.push({
      name: `${g.name}-${c.hat}-half`,
      x: at.x + v.span * 0.43,
      y: at.y + v.span * 0.31,
      span: v.span * 1.3,
      mode: 'logical',
    });
  });
  const xs = g.graph.nodes.map((n) => n.x);
  const ys = g.graph.nodes.map((n) => n.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(x1 - x0, ((y1 - y0) * WIDTH) / 900) + 40;
  const whole = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, span };
  for (const mode of ['logical', 'debug'] as const)
    views.push({ name: `${g.name}-whole-${mode}`, ...whole, mode });
  return views;
}

async function ready(url: string) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no server at ${url}`);
}

function serve(cwd: string, port: number): ChildProcess {
  return spawn('bunx', ['vite', '--port', String(port), '--strictPort'], { cwd, stdio: 'ignore' });
}

/** Sets the layers to what a view needs: the debug layer on or off (Ctrl+.), the physical markings (Ctrl+/). */
async function setMode(page: Page, now: { debug: boolean; physical: boolean }, mode: View['mode']) {
  const want = { debug: mode === 'debug', physical: mode === 'physical' };
  if (now.debug !== want.debug) await page.keyboard.press('Control+.');
  if (now.physical !== want.physical) await page.keyboard.press('Control+/');
  Object.assign(now, want);
}

/** What the canvas shows for each view, as the data of its picture. */
async function paint(url: string, sets: { name: string; graph: Graph; views: View[] }[]) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 } });
  await page.goto(url);
  await page.waitForFunction(() => window.__modelcity?.session.ready);
  const pictures = new Map<string, string>();
  const now = { debug: false, physical: false };
  for (const set of sets) {
    await page.evaluate((g) => (window.__modelcity!.editor.graph = g), set.graph);
    await page.mouse.move(WIDTH - 5, 5);
    for (const v of set.views) {
      await setMode(page, now, v.mode);
      pictures.set(
        v.name,
        await page.evaluate(
          async (s) => {
            window.__modelcity!.show({ x: s.x, y: s.y, scale: s.width / s.span, rotation: 0 });
            await new Promise((r) => requestAnimationFrame(r));
            await new Promise((r) => requestAnimationFrame(r));
            return document.querySelector('canvas')!.toDataURL();
          },
          { x: v.x, y: v.y, span: v.span, width: WIDTH },
        ),
      );
    }
  }
  for (const set of sets) {
    const centers = [0, 0.5, 1]
      .map((f) => set.views[Math.floor(f * (set.views.length - 1))]!)
      .filter(Boolean);
    for (const [name, data] of await scenes(page, { name: set.name, graph: set.graph, centers }))
      pictures.set(name, data);
  }
  await browser.close();
  return pictures;
}

function save(name: string, a: string, b: string) {
  mkdirSync(OUT, { recursive: true });
  const png = (d: string) => Buffer.from(d.replace(/^data:image\/png;base64,/, ''), 'base64');
  writeFileSync(`${OUT}/${name}-base.png`, png(a));
  writeFileSync(`${OUT}/${name}-this.png`, png(b));
}

async function main() {
  const sets = [
    ...grounds.map((g) => ({ name: g.name, graph: g.graph, views: viewsOf(g) })),
    (() => {
      const graph = tiledMap(27);
      const g: Ground = { name: 'tiled', graph, cases: [] };
      return { name: g.name, graph, views: viewsOf(g) };
    })(),
  ];
  const only = process.env.FILTER ? new RegExp(process.env.FILTER) : null;
  if (only) sets.forEach((set) => (set.views = set.views.filter((v) => only.test(v.name))));
  const total = sets.reduce((n, s) => n + s.views.length, 0);
  if (!existsSync(BASE_DIR))
    execSync(`git worktree add --detach ${BASE_DIR} ${base}`, { stdio: 'inherit' });
  // The folder of an earlier run holds the base of that run: put the base of this one in it.
  else execSync(`git -C ${BASE_DIR} checkout --detach ${base}`, { stdio: 'inherit' });
  if (!existsSync(`${BASE_DIR}/node_modules`))
    symlinkSync(`${process.cwd()}/node_modules`, `${BASE_DIR}/node_modules`);
  const servers = [serve(BASE_DIR, 5174), serve(process.env.SELF ? BASE_DIR : process.cwd(), 5175)];
  try {
    await Promise.all([ready('http://localhost:5174'), ready('http://localhost:5175')]);
    console.log(`${total} views, base ${base}`);
    const before = await paint('http://localhost:5174', sets);
    const after = await paint('http://localhost:5175', sets);
    const different = [...before]
      .filter(([name, data]) => after.get(name) !== data)
      .map(([name]) => name);
    different.forEach((name) => save(name, before.get(name)!, after.get(name)!));
    console.log(
      different.length
        ? `DIFFERENT: ${different.length} of ${total}\n${different.join('\n')}`
        : `identical: all ${total} views, pixel for pixel`,
    );
    process.exitCode = different.length ? 1 : 0;
  } finally {
    servers.forEach((s) => s.kill());
  }
}

void main();

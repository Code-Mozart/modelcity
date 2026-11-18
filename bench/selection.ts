import { mkdirSync, writeFileSync } from 'node:fs';
import { composeDeltas, deltaOf, afterBox, type Selection } from '../src/lib/editor/selection';
import { record, NO_HISTORY } from '../src/lib/editor/history';
import { pick } from '../src/lib/editor/pick';
import { SelectionPins } from '../src/lib/editor/pins';
import { panelView } from '../src/lib/hud/panel';
import { nodeAt, nodesInBox, segmentAt, type LoadedMap } from '../src/lib/map/hit';
import { marksOf } from '../src/lib/render/marksOf';
import { curveOf } from '../src/lib/map/curve';
import { edge, loaded, node } from '../src/lib/testing/loadedMap';
import type { EdgeRow, NodeRow } from '../src/lib/project/storage';

/**
 * How fast selection is (^1257): the same numbers every run (a seeded map and seeded pointer
 * positions), on one machine, in one process: `bun run bench:selection`. It does not measure the
 * browser (that is `bun run bench`): it measures the work that the pointer and a frame ask for,
 * on the rows that a view holds. A report is written to `bench/out/selection-*.md`.
 */
const SPACING = 40;
const REPEATS = 7;
const SEED = 20261118;

function dice(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

/** A map like that of the benchmarks: rows of straight roads joined by S-curves at every 8th column. */
function grid(nodes: number): { nodes: NodeRow[]; edges: EdgeRow[]; cols: number; rows: number } {
  const cols = Math.ceil(Math.sqrt(nodes));
  const rows = Math.ceil(nodes / cols);
  const n: NodeRow[] = [];
  const e: EdgeRow[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) n.push(node(r * cols + c, c * SPACING, r * SPACING));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) e.push(edge(e.length, r * cols + c, r * cols + c + 1));
    for (let c = 0; c < cols && r + 1 < rows; c += 8)
      e.push(edge(e.length, r * cols + c, (r + 1) * cols + c));
  }
  return { nodes: n, edges: e, cols, rows };
}

/** The median of the times of `fn` in milliseconds, after one run that is not counted. */
function time(fn: () => void): number {
  fn();
  const runs: number[] = [];
  for (let i = 0; i < REPEATS; i++) {
    const t = performance.now();
    fn();
    runs.push(performance.now() - t);
  }
  return runs.sort((a, b) => a - b)[Math.floor(REPEATS / 2)]!;
}

const f = (ms: number) => (ms < 0.01 ? '< 0.01' : ms < 10 ? ms.toFixed(2) : ms.toFixed(1));

/** What a screen holds, in rows, for the three sizes: a small view, a large one, a view zoomed far out. */
const VIEWS = [5_000, 20_000, 80_000];

function pointer(map: LoadedMap, g: ReturnType<typeof grid>) {
  const rand = dice(SEED);
  const side = g.cols * SPACING;
  const points = Array.from({ length: 200 }, () => ({ x: rand() * side, y: rand() * side }));
  // The reach of 9 px at the scale at which the view shows this much: the larger the view, the farther the reach in meters.
  const reach = 9 / (1100 / side);
  return {
    pick: time(() => points.forEach((p) => pick(map, p, reach))) / points.length,
    node: time(() => points.forEach((p) => nodeAt(map, p, reach))) / points.length,
    segment: time(() => points.forEach((p) => segmentAt(map, p, reach))) / points.length,
    reach,
  };
}

const rows: string[] = [];
const say = (line: string) => {
  console.log(line);
  rows.push(line);
};

say('# modelcity: selection, measured (^1257)\n');
say(
  `- Machine: ${process.platform} ${process.arch}, bun ${Bun.version}, seed ${SEED}, median of ${REPEATS}\n`,
);
say(
  '| Loaded in view (nodes) | Pick at the pointer (ms) | node | segment | Box over the whole screen (ms) | Nodes in it |',
);
say('|---|---|---|---|---|---|');
const grids = VIEWS.map((n) => ({ g: grid(n), n }));
const maps = grids.map(({ g }) => loaded(g.nodes, g.edges));
grids.forEach(({ g, n }, i) => {
  const map = maps[i]!;
  const p = pointer(map, g);
  const scale = 1100 / (g.cols * SPACING);
  const view = {
    cx: (g.cols * SPACING) / 2,
    cy: (g.rows * SPACING) / 2,
    scale,
    rot: 0.3,
    gx: 0,
    gy: 0,
  };
  const size = { width: 1100, height: 800 };
  let found = 0;
  const box = time(() => {
    found = nodesInBox(map, { view, size }, { x: 0, y: 0 }, { x: size.width, y: size.height }).nodes
      .length;
  });
  say(
    `| ${n.toLocaleString('en')} | ${f(p.pick)} | ${f(p.node)} | ${f(p.segment)} | ${f(box)} | ${found.toLocaleString('en')} |`,
  );
});

// What a frame asks for with a selection: which of the nodes in view are selected, and their segments.
say(
  '\n| Selected nodes | Marks of a frame (ms), 20,000 nodes in view | Pins (ms) | Select by box: new selection (ms) | One history step (ms) |',
);
say('|---|---|---|---|---|');
const g20 = grids[1]!.g;
const map20 = maps[1]!;
const inView = (() => {
  const edges = new Map<number, { row: EdgeRow; edge: ReturnType<typeof curveOf> }>();
  for (const e of g20.edges)
    edges.set(e[0], { row: e, edge: curveOf(e, g20.nodes[e[1]]!, g20.nodes[e[2]]!) });
  return { nodes: [g20.nodes], edges };
})();
for (const count of [0, 1_000, 20_000, 100_000]) {
  const ids = Array.from({ length: count }, (_, i) => i % g20.nodes.length);
  const sel: Selection = new Set(ids);
  const marks = time(() =>
    marksOf({ selection: sel, hover: null, band: null, branch: null }, inView, map20.nodeOf),
  );
  const pins = time(() => new SelectionPins().pinnedFor(sel, map20.nodeOf));
  const box = time(() => afterBox(new Set(), ids, false));
  const step = time(() => deltaOf(new Set(), sel));
  say(`| ${count.toLocaleString('en')} | ${f(marks)} | ${f(pins)} | ${f(box)} | ${f(step)} |`);
}

// The history: 200 steps of 1,000 nodes each, and the panel that reads it.
say('\n| History of 200 steps of 1,000 nodes | ms |');
say('|---|---|');
const steps = Array.from({ length: 200 }, (_, i) => {
  const before = new Set(Array.from({ length: 1000 }, (_, k) => i * 1000 + k));
  const after = new Set(Array.from({ length: 1000 }, (_, k) => (i + 1) * 1000 + k));
  return { before, after };
});
let history = NO_HISTORY;
say(
  `| Take them all (ms) | ${f(
    time(() => {
      history = NO_HISTORY;
      for (const s of steps)
        history = record(history, {
          name: 'select',
          kind: 'select',
          continues: true,
          selection: deltaOf(s.before, s.after),
          selectedAfter: s.after.size,
        });
    }),
  )} |`,
);
say(`| The panel of the history (ms) | ${f(time(() => panelView(history)))} |`);
say(
  `| Compose the changes of 200 steps (ms) | ${f(time(() => composeDeltas(history.past.map((s) => s.selection))))} |`,
);

mkdirSync('bench/out', { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
writeFileSync(`bench/out/selection-${stamp}.md`, rows.join('\n') + '\n');
console.log(`\nThe report is in bench/out/selection-${stamp}.md`);

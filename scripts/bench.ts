/**
 * The benchmark of the pipeline (^928): the stages that turn a graph into what is painted, on the
 * sample maps of growing size (^929). `bun run bench [maxCells] [budgetSeconds]`. Each stage is run
 * a few times (the first run warms up) and the median and the spread are printed; a stage that
 * took longer than the budget on a map is not run on the larger ones, so nothing hangs. Not part
 * of `bun run ci`: timings are for comparing before and after on one machine, never to fail on.
 */
import { hullsOf } from '../src/lib/editor/corners';
import { derivedNodes, withDerived } from '../src/lib/editor/derived';
import { goresOf } from '../src/lib/editor/gores';
import { laneChangesOf } from '../src/lib/editor/laneChanges';
import { junctionEdgeIds, laneFactsOf } from '../src/lib/editor/laneFacts';
import { markingsOf } from '../src/lib/editor/markings';
import { patched, surfaceFrom } from '../src/lib/editor/surface';
import { signsOf } from '../src/lib/editor/signs';
import { towersOf } from '../src/lib/editor/towers';
import { SIZES, connectedMap, tiledMap } from '../src/lib/testing/samples';

const maxCells = Number(process.argv[2] ?? 1000);
const budgetMs = Number(process.argv[3] ?? 10) * 1000;
const RUNS = 3;

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const dropped = new Set<string>();

function time(stage: string, run: () => unknown): { value: unknown; ms: number | null } {
  if (dropped.has(stage)) return { value: undefined, ms: null };
  const times: number[] = [];
  let value: unknown;
  for (let i = 0; i < RUNS; i++) {
    const a = performance.now();
    value = run();
    times.push(performance.now() - a);
    if (times[i]! > budgetMs) break;
  }
  if (Math.max(...times) > budgetMs) dropped.add(stage);
  return { value, ms: median(times) };
}

for (const cells of SIZES.filter((c) => c <= maxCells)) {
  const g = (process.env.MAP === 'connected' ? connectedMap : tiledMap)(cells);
  const row: string[] = [];
  const stage = <T>(name: string, run: () => T, ...need: unknown[]): T | undefined => {
    if (need.some((n) => n === undefined)) return undefined;
    const { value, ms } = time(name, run);
    row.push(`${name} ${ms === null ? 'skipped' : `${ms.toFixed(0)}ms`}`);
    return value as T | undefined;
  };
  const d = stage('derivedNodes', () => derivedNodes(g));
  const seen = stage('withDerived', () => withDerived(g, d!), d);
  const hulls = stage('hullsOf', () => hullsOf(g));
  const changes = stage('laneChanges', () => laneChangesOf(seen!), seen);
  const gores = stage('gores', () => goresOf(seen!, changes!, hulls!), seen, changes, hulls);
  const raw = stage(
    'surface',
    () =>
      surfaceFrom(
        hulls!,
        gores!.map((w) => w.loop),
      ),
    hulls,
    gores,
  );
  stage('patched', () => patched(raw!), raw);
  stage('laneFacts', () => laneFactsOf(g));
  stage('towers', () => towersOf(seen!), seen);
  stage('signs', () => signsOf(g, seen!), seen);
  const inside = stage('junctionEdges', () => junctionEdgeIds(g));
  stage(
    'markings',
    () => markingsOf(seen!, { physical: false, extra: [], inside: inside! }),
    seen,
    inside,
  );
  stage(
    'markings+clip',
    () => markingsOf(seen!, { physical: false, extra: [], surface: raw!, inside: inside! }),
    seen,
    raw,
    inside,
  );
  console.log(
    `${cells} cells, ${g.nodes.length} nodes, ${g.edges.length} segments\n  ${row.join('\n  ')}`,
  );
}

/**
 * The cost of an edit (^941): the pipeline of the surface and the markings is run on a connected map
 * (cold), then again after moving one node (the edit), twice. `bun scripts/benchEdit.ts [cells]`.
 * An edit should cost what it touches, not the map: compare the edit with the cold run.
 */
import { hullsOf } from '../src/lib/editor/corners';
import { derivedNodes, withDerived } from '../src/lib/editor/derived';
import { goresOf } from '../src/lib/editor/gores';
import { laneChangesOf } from '../src/lib/editor/laneChanges';
import { junctionEdgeIds, laneFactsOf } from '../src/lib/editor/laneFacts';
import { markingsOf } from '../src/lib/editor/markings';
import { patched, surfaceFrom } from '../src/lib/editor/surface';
import { moveNodes, placed, type Graph } from '../src/lib/model/graph';
import { connectedMap } from '../src/lib/testing/samples';

const cells = Number(process.argv[2] ?? 250);

/** The time of each stage of the last run, in ms. */
const stages: Record<string, number> = {};
const stage = <T>(name: string, run: () => T): T => {
  const a = performance.now();
  const out = run();
  stages[name] = Math.round(performance.now() - a);
  return out;
};

export function pipeline(g: Graph) {
  const seen = stage('derived', () => withDerived(g, derivedNodes(g)));
  const hulls = stage('hulls', () => hullsOf(g));
  const changes = stage('laneChanges', () => laneChangesOf(seen));
  const gores = stage('gores', () => goresOf(seen, changes, hulls));
  const raw = stage('surface', () =>
    surfaceFrom(
      hulls,
      gores.map((w) => w.loop),
    ),
  );
  const surface = stage('patched', () => patched(raw));
  const inside = stage('junctionEdges', () => junctionEdgeIds(g));
  const markings = stage('markings+clip', () =>
    markingsOf(seen, {
      physical: false,
      extra: gores.flatMap((w) => w.markings),
      surface,
      inside,
    }),
  );
  return { surface, markings, facts: stage('laneFacts', () => laneFactsOf(g)) };
}

const time = (label: string, run: () => unknown) => {
  const a = performance.now();
  const out = run();
  console.log(`${label}: ${(performance.now() - a).toFixed(0)} ms`);
  return out;
};

let g = connectedMap(cells);
console.log(`${cells} cells, ${g.nodes.length} nodes`);
time('cold', () => pipeline(g));
const mid = g.nodes[Math.floor(g.nodes.length / 2)]!;
for (let i = 1; i <= 3; i++) {
  g = moveNodes(g, placed(g, [mid.id]), { x: 0.5, y: 0 });
  time(`edit ${i}`, () => pipeline(g));
  console.log(JSON.stringify(stages));
}

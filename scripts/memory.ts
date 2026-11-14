/**
 * The memory of a map (^1216): the graph, then what is made from it, per node and per segment. `bun scripts/memory.ts [cells]`.
 */
import { hullsOf } from '../src/lib/editor/corners';
import { curvesOf } from '../src/lib/editor/derived';
import { connectedMap } from '../src/lib/testing/samples';

const cells = Number(process.argv[2] ?? 1000);
const used = () => {
  Bun.gc(true);
  return process.memoryUsage().heapUsed / 1e6;
};
const base = used();
const g = connectedMap(cells);
const graph = used() - base;
const a = used();
const curves = curvesOf(g);
const curveMb = used() - a;
const b = used();
const hulls = hullsOf(g);
const hullMb = used() - b;
const [n, e] = [g.nodes.length, g.edges.length];
console.log(`${n} nodes, ${e} segments`);
console.log(`graph ${graph.toFixed(0)} MB (${((graph * 1e6) / n).toFixed(0)} B/node)`);
console.log(`curves ${curveMb.toFixed(0)} MB (${((curveMb * 1e6) / e).toFixed(0)} B/segment)`);
console.log(`hulls ${hullMb.toFixed(0)} MB (${((hullMb * 1e6) / e).toFixed(0)} B/segment)`);
void curves;
void hulls;

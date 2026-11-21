import { describe, expect, it } from 'vitest';
import { chunkId, chunkOf } from '../map/chunks';
import type { Chunk } from '../map/chunkLoader';
import { loaded } from '../testing/loadedMap';
import { junctionGround } from '../testing/junctionGround';
import { roundToMm, type Graph } from '../model/graph';
import { derivedInChunk, neighbourhood } from './chunkDerived';
import { derivedNodes } from './derivedNodes';

const mm = (v: number) => Math.round(v * 1000);
const place = (d: { x: number; y: number; th: number; kind: string }) =>
  `${mm(d.x)},${mm(d.y)},${d.kind}`;

/** A graph moved by (dx, dy) meters, as rows. */
function rowsOf(g: Graph, dx: number, dy: number) {
  const r = roundToMm({ ...g, nodes: g.nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy })) });
  return {
    graph: r,
    nodes: r.nodes.map((n): [number, number, number, number] => [n.id, mm(n.x), mm(n.y), n.th]),
    edges: r.edges.map((e): [number, number, number, number | null, number] => [
      e.id,
      e.start,
      e.end,
      e.radius === null ? null : mm(e.radius),
      e.lane,
    ]),
  };
}

describe('the derived nodes of a chunk, made from it and its neighbours (^1268)', () => {
  // The ground moved so that the borders of the chunks run through its junctions, in several ways.
  it.each([
    [0, 0],
    [-120, -40],
    [-250, -250],
    [100, -200],
  ])('are those of the whole map in the chunk, the ground moved by (%i, %i)', (dx, dy) => {
    const { graph, nodes, edges } = rowsOf(junctionGround(), dx, dy);
    const whole = derivedNodes(graph);
    expect(whole.length).toBeGreaterThan(20);
    const map = loaded(nodes, edges);
    const chunk = (id: string) => {
      const s = map.chunks.get(id);
      return s?.status === 'ready' ? [s.chunk] : [];
    };
    const ids = new Set(whole.map((d) => chunkId(...chunkOf(d.x, d.y))));
    for (const id of ids) {
      const around: Chunk[] = neighbourhood(id).flatMap(chunk);
      const mine = whole
        .filter((d) => chunkId(...chunkOf(d.x, d.y)) === id)
        .map(place)
        .sort();
      expect(derivedInChunk(id, around).map(place).sort(), id).toEqual(mine);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { moveNodes, placed, withNode, withRadius, type Graph } from '../model/graph';
import { angleGround } from '../testing/angleGround';
import { connectedMap } from '../testing/samples';
import { tGround } from '../testing/tGround';
import { chainsFromNothing, chainsOf } from './chainsLive';

const random = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const said = (g: Graph) => JSON.stringify(chainsFromNothing(g));

describe('the chains made again where an edit changed something are the chains made from nothing (^941)', () => {
  const grounds: [string, Graph][] = [
    ['connected map', connectedMap(8)],
    ['angle ground', angleGround()],
    ['T ground', tGround()],
  ];
  it.each(grounds)(
    '%s, on random moves, turns and new radii',
    (_name, start) => {
      const next = random(11);
      let g = start;
      expect(JSON.stringify(chainsOf(g))).toBe(said(g));
      for (let step = 0; step < 14; step++) {
        const n = g.nodes[Math.floor(next() * g.nodes.length)]!;
        const e = g.edges[Math.floor(next() * g.edges.length)]!;
        const kind = step % 3;
        g =
          kind === 0
            ? moveNodes(g, placed(g, [n.id]), { x: (next() - 0.5) * 6, y: (next() - 0.5) * 6 })
            : kind === 1
              ? withRadius(g, e.id, e.radius === null ? 20 + next() * 40 : null)
              : withNode(g, n.id, { th: n.th + (next() - 0.5) });
        expect(JSON.stringify(chainsOf(g))).toBe(said(g));
      }
    },
    60_000,
  );

  it('a graph with something added or removed gets all its chains', () => {
    const g = connectedMap(4);
    chainsOf(g);
    const fewer = {
      ...g,
      nodes: g.nodes.slice(0, -1),
      edges: g.edges.filter((e) => e.end !== g.nodes.at(-1)!.id && e.start !== g.nodes.at(-1)!.id),
    };
    expect(JSON.stringify(chainsOf(fewer))).toBe(said(fewer));
  });
});

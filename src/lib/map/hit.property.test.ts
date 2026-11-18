import { describe, expect, it } from 'vitest';
import { screenToWorld, worldToScreen, type Size, type View } from '../camera/view';
import { distanceToPiece, isDegenerate, nearestParam, pointOn } from '../curves/piece';
import { dist } from '../curves/vec';
import type { EdgeRow, NodeRow } from '../project/storage';
import { edge, loaded, node } from '../testing/loadedMap';
import { curveOf } from './curve';
import { nodeAt, nodesInBox, segmentAt } from './hit';

/** Numbers that are the same for every run (a small generator), so a failure can be repeated. */
function dice(seed: number) {
  let s = seed;
  const next = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  return { next, range: (a: number, b: number) => a + (b - a) * next() };
}

/** A random map: nodes spread over a few chunks, segments between random pairs that are not too far apart. */
function randomMap(rand: ReturnType<typeof dice>) {
  const count = 5 + Math.floor(rand.range(0, 30));
  const nodes: NodeRow[] = Array.from({ length: count }, (_, i) =>
    node(i, rand.range(-600, 600), rand.range(-600, 600)),
  );
  const edges: EdgeRow[] = [];
  for (let i = 0; i < count * 1.5; i++) {
    const [a, b] = [Math.floor(rand.range(0, count)), Math.floor(rand.range(0, count))];
    if (a !== b) edges.push(edge(edges.length, a, b));
  }
  return { nodes, edges };
}

/** The nearest segment by looking at all of them (what `segmentAt` finds by looking at the chunks round the point). */
function nearestSegment(
  nodes: NodeRow[],
  edges: EdgeRow[],
  pt: { x: number; y: number },
  reach: number,
) {
  let best: { id: number; d: number } | null = null;
  for (const e of edges) {
    const [p, q] = [nodes[e[1]]!, nodes[e[2]]!];
    for (const piece of curveOf(e, p, q).pieces) {
      if (isDegenerate(piece) || distanceToPiece(piece, pt) > reach) continue;
      const d = dist(pointOn(piece, nearestParam(piece, pt)), pt);
      if (d <= reach && (!best || d < best.d)) best = { id: e[0], d };
    }
  }
  return best;
}

const size: Size = { width: 500, height: 400 };

describe('what is found equals what looking at everything finds (random maps and views, ^1257)', () => {
  it('the nearest node and the nearest segment, at any scale, also with a reach larger than a chunk', () => {
    const rand = dice(11);
    for (let run = 0; run < 40; run++) {
      const { nodes, edges } = randomMap(rand);
      const map = loaded(nodes, edges);
      for (let k = 0; k < 15; k++) {
        const pt = { x: rand.range(-700, 700), y: rand.range(-700, 700) };
        const reach = [2, 9, 40, 300, 600][k % 5]!;
        const near = nodes
          .map((n) => ({ id: n[0], d: dist({ x: n[1] / 1000, y: n[2] / 1000 }, pt) }))
          .filter((n) => n.d <= reach)
          .sort((a, b) => a.d - b.d)[0];
        expect(nodeAt(map, pt, reach)?.[0]).toBe(near?.id);
        const seg = nearestSegment(nodes, edges, pt, reach);
        const found = segmentAt(map, pt, reach);
        if (seg) expect(found?.d).toBeCloseTo(seg.d, 6);
        else expect(found).toBeNull();
      }
    }
  });

  it('the nodes in a box of the screen, with the view turned and at any scale', () => {
    const rand = dice(23);
    for (let run = 0; run < 60; run++) {
      const { nodes } = randomMap(rand);
      const map = loaded(nodes, []);
      const view: View = {
        cx: rand.range(-300, 300),
        cy: rand.range(-300, 300),
        scale: rand.range(0.3, 3),
        rot: rand.range(-Math.PI, Math.PI),
        gx: 0,
        gy: 0,
      };
      const [a, b] = [
        { x: rand.range(0, size.width), y: rand.range(0, size.height) },
        { x: rand.range(0, size.width), y: rand.range(0, size.height) },
      ];
      const [x0, x1, y0, y1] = [
        Math.min(a.x, b.x),
        Math.max(a.x, b.x),
        Math.min(a.y, b.y),
        Math.max(a.y, b.y),
      ];
      const want = nodes
        .filter((n) => {
          const s = worldToScreen(view, size, { x: n[1] / 1000, y: n[2] / 1000 });
          return s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1;
        })
        .map((n) => n[0])
        .sort((p, q) => p - q);
      const got = nodesInBox(map, { view, size }, a, b);
      expect(got.nodes.sort((p, q) => p - q)).toEqual(want);
      expect(got.waiting).toBe(0);
    }
  });

  it('the screen and the world agree on where a point is (the box uses both)', () => {
    const view: View = { cx: 12, cy: -7, scale: 1.7, rot: 2.1, gx: 0, gy: 0 };
    const p = { x: 33, y: 44 };
    const back = screenToWorld(view, size, worldToScreen(view, size, p));
    expect([back.x, back.y]).toEqual([expect.closeTo(33, 6), expect.closeTo(44, 6)]);
  });
});

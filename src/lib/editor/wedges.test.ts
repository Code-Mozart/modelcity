import { describe, expect, it } from 'vitest';
import { loopArea } from '../curves/area';
import { insideLoops } from '../curves/union';
import { dist } from '../curves/vec';
import { junctionGround } from '../testing/junctionGround';
import { hullsOf } from './corners';
import { derivedNodes, withDerived } from './derived';
import { laneChangesOf } from './laneChanges';
import { surfaceFrom } from './surface';
import { WEDGE_RADIUS_M, wedgesOf } from './wedges';

const g = junctionGround();
const d = withDerived(g, derivedNodes(g));
const changes = laneChangesOf(d);
const near = (x: number, y: number) =>
  changes.filter((c) => Math.abs(c.node.x - x) < 0.01 && Math.abs(c.node.y - y) < 0.01);

describe('the wedge where an extension ends (^1065)', () => {
  const [wedge] = wedgesOf(d, near(260 - 10.165, 1440 + 2.365));

  it('is one closed loop with an area, closed by an arc of the circle that fits', () => {
    expect(wedge).toBeDefined();
    const loop = wedge!.loop;
    expect(dist(loop[0]!.P, loop.at(-1)!.Q)).toBeLessThan(1e-6);
    expect(loopArea(loop)).toBeGreaterThan(1);
    const arc = loop.find((p) => p.type === 'arc' && p.r <= WEDGE_RADIUS_M + 1e-6 && p.r > 1);
    expect(arc).toBeDefined();
  });

  it('adds road surface where there was none', () => {
    const loop = wedge!.loop;
    const [raw, filled] = [surfaceFrom(hullsOf(g)), surfaceFrom(hullsOf(g), [loop])];
    const [x0, y0] = [Math.min(...loop.map((p) => p.P.x)), Math.min(...loop.map((p) => p.P.y))];
    const added: boolean[] = [];
    for (let x = x0; x < x0 + 12; x += 0.2) {
      for (let y = y0 - 1; y < y0 + 4; y += 0.2) {
        if (insideLoops([loop], { x, y }) && !insideLoops(raw, { x, y })) {
          added.push(insideLoops(filled, { x, y }));
        }
      }
    }
    expect(added.length).toBeGreaterThan(5);
    expect(added.every(Boolean)).toBe(true);
  });

  it('is marked by a solid line round it and chevrons with their apex against the traffic, which runs east here', () => {
    const [outline, ...chevrons] = wedge!.markings;
    expect(outline!.kind).toBe('solid');
    expect(chevrons.length).toBeGreaterThan(0);
    for (const c of chevrons) {
      const [tail1, apex, tail2] = [c.pieces[0]!.P, c.pieces[0]!.Q, c.pieces[1]!.Q];
      expect(apex.x).toBeLessThan(tail1.x);
      expect(apex.x).toBeLessThan(tail2.x);
    }
  });
});

describe('wedges of the testing ground', () => {
  it('none where a lane change has no two lanes that part (lane drop and gain ^991: the lanes end, not part)', () => {
    const all = wedgesOf(d, changes);
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(all.every((w) => loopArea(w.loop) > 0)).toBe(true);
  });
});

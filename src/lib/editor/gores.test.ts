import { describe, expect, it } from 'vitest';
import { loopArea } from '../curves/area';
import { insideLoops } from '../curves/union';
import { dist } from '../curves/vec';
import { junctionGround } from '../testing/junctionGround';
import { hullsOf } from './corners';
import { derivedNodes, withDerived } from './derived';
import { laneChangesOf } from './laneChanges';
import { surfaceFrom } from './surface';
import { GORE_RADIUS_M, goresOf } from './gores';

const g = junctionGround();
const d = withDerived(g, derivedNodes(g));
const changes = laneChangesOf(d);
const hulls = hullsOf(g);
const near = (x: number, y: number) =>
  changes.filter((c) => Math.abs(c.node.x - x) < 0.01 && Math.abs(c.node.y - y) < 0.01);

describe('the gore where an extension ends (^1065)', () => {
  const [gore] = goresOf(d, near(260 - 10.165, 1440 + 2.365), hulls);

  it('is one closed loop with an area, closed by an arc of the circle that fits', () => {
    expect(gore).toBeDefined();
    const loop = gore!.loop;
    expect(dist(loop[0]!.P, loop.at(-1)!.Q)).toBeLessThan(1e-6);
    expect(loopArea(loop)).toBeGreaterThan(1);
    const arc = loop.find((p) => p.type === 'arc' && p.r <= GORE_RADIUS_M + 1e-6 && p.r > 1);
    expect(arc).toBeDefined();
  });

  it('adds road surface where there was none', () => {
    const loop = gore!.loop;
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
    const [outline, ...chevrons] = gore!.markings;
    expect(outline!.kind).toBe('solid');
    expect(chevrons.length).toBeGreaterThan(0);
    for (const c of chevrons) {
      const [tail1, apex, tail2] = [c.pieces[0]!.P, c.pieces[0]!.Q, c.pieces[1]!.Q];
      expect(apex.x).toBeLessThan(tail1.x);
      expect(apex.x).toBeLessThan(tail2.x);
    }
  });
});

describe('gores of the testing ground', () => {
  it('none where a lane change has no two lanes that part (lane drop and gain ^991: the lanes end, not part)', () => {
    const all = goresOf(d, changes, hulls);
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(all.every((w) => loopArea(w.loop) > 0)).toBe(true);
  });
});

describe('no slivers (^1066)', () => {
  it('every gore of the testing ground is wide enough for the circle: its area is more than a sliver', () => {
    const all = goresOf(d, changes, hulls);
    for (const w of all) expect(loopArea(w.loop)).toBeGreaterThan(1);
  });

  it('the noses case: one gore where the lane leaves and one where the other arrives, each some meters long', () => {
    const mine = goresOf(d, changes, hulls).filter(
      (w) =>
        Math.abs(w.loop[0]!.P.y - 1680) < 25 &&
        w.loop[0]!.P.x > 260 - 60 &&
        w.loop[0]!.P.x < 260 + 50,
    );
    expect(mine).toHaveLength(2);
    for (const w of mine) expect(loopArea(w.loop)).toBeGreaterThan(5);
  });
});

describe('only where no other lane is in the way (^1065)', () => {
  const all = goresOf(d, changes, hulls);
  const at = (x0: number, y0: number, w: number, h: number) =>
    all.filter(
      (g) =>
        g.loop[0]!.P.x >= x0 &&
        g.loop[0]!.P.x < x0 + w &&
        g.loop[0]!.P.y >= y0 &&
        g.loop[0]!.P.y < y0 + h,
    );

  it('the pockets of the X junction (^990, cell 2/1) get none: the lanes of the crossing road are in the way', () => {
    expect(at(480, 240 - 60, 100, 120)).toHaveLength(0);
  });

  it('the ramps (^992) get theirs: only their own lanes are beside them', () => {
    expect(at(0, 480, 520, 20).length).toBeGreaterThanOrEqual(2);
  });
});

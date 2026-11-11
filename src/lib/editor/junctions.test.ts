import { describe, expect, it } from 'vitest';
import { junctionGround } from '../testing/junctionGround';
import { junctionHull, junctionsOf, type Junction } from './junctions';
import { insideLoops } from '../curves/union';

const g = junctionGround();
const junctions = junctionsOf(g);
const node = (id: number) => g.nodes.find((n) => n.id === id)!;
/** The junction around a place of the testing ground. */
const near = (x: number, y: number): Junction =>
  junctions.find((j) =>
    j.segments.some((id) => {
      const e = g.edges.find((e) => e.id === id)!;
      return Math.hypot(node(e.start).x - x, node(e.start).y - y) < 15;
    }),
  )!;
const waits = (j: Junction) => j.approaches.map((a) => a.waits);

describe('junctions are found by rules (^1005, ^1032)', () => {
  it('T-junction ^985: one junction, three approaches, two of them one road', () => {
    const j = near(0, 0);
    expect(j.approaches).toHaveLength(3);
    expect(new Set(j.approaches.map((a) => a.road)).size).toBe(2);
  });

  it('X-junction ^988: four approaches in two roads', () => {
    const j = near(0, 240);
    expect(j.approaches).toHaveLength(4);
    expect(new Set(j.approaches.map((a) => a.road)).size).toBe(2);
  });

  it('crossings without a node ^994 are a junction of two segments', () => {
    const j = junctions.find((j) => j.segments.length === 2 && near(0, 720) === undefined);
    expect(j).toBeDefined();
    expect(j!.approaches).toHaveLength(4);
  });

  it('a lane that only merges or splits and crosses nothing (^991) is no junction', () => {
    expect(near(-30, 480)).toBeUndefined();
  });
});

describe('how a junction is ruled (^1037, ^1038)', () => {
  it('roads of one lane each way: right before left, nobody waits', () => {
    for (const [x, y] of [
      [0, 0],
      [0, 240],
    ] as const) {
      const j = near(x, y);
      expect(j.control).toBe('right before left');
      expect(waits(j).every((w) => w === null)).toBe(true);
    }
  });

  it('a 1+1 road meets a 2+2 road: the wider has priority, the narrower gives way', () => {
    for (const [x, y] of [
      [260, 0],
      [260, 240],
    ] as const) {
      const j = near(x, y);
      expect(j.control).toBe('priority');
      const wide = Math.max(...j.approaches.map((a) => a.lanes));
      for (const a of j.approaches) expect(a.waits).toBe(a.lanes < wide ? 'give way' : null);
      expect(j.approaches.some((a) => a.waits === 'give way')).toBe(true);
    }
  });

  it('roads of more than one lane each way: traffic lights, every approach stops at a line', () => {
    const j = near(520, 240);
    expect(j.control).toBe('traffic lights');
    expect(waits(j).every((w) => w === 'stop')).toBe(true);
  });
});

describe('the hull of a junction for the debug layer (^1039)', () => {
  it('one outline that holds the segments of the junction with some padding', () => {
    const j = near(0, 0);
    const loops = junctionHull(g, j);
    expect(loops.length).toBeGreaterThan(0);
    expect(insideLoops(loops, { x: 0, y: 0 })).toBe(true);
    expect(insideLoops(loops, { x: 0, y: -6 })).toBe(false);
  });
});

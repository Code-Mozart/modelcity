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
const waits = (j: Junction) => j.arms.map((a) => a.waits);

describe('junctions are found by rules (^1005, ^1032)', () => {
  it('T-junction ^985: one junction, three arms, two of them one road', () => {
    const j = near(0, 0);
    expect(j.arms).toHaveLength(3);
    expect(new Set(j.arms.map((a) => a.direction)).size).toBe(2);
  });

  it('X-junction ^988: four arms in two roads', () => {
    const j = near(0, 240);
    expect(j.arms).toHaveLength(4);
    expect(new Set(j.arms.map((a) => a.direction)).size).toBe(2);
  });

  it('crossings without a node ^994 are a junction of two segments', () => {
    const j = junctions.find((j) => j.segments.length === 2 && near(0, 720) === undefined);
    expect(j).toBeDefined();
    expect(j!.arms).toHaveLength(4);
  });

  it('a lane that only merges or splits and crosses nothing (^991) is no junction', () => {
    expect(near(-30, 480)).toBeUndefined();
  });
});

describe('how a junction is ruled (^1037, ^1038, ^1047)', () => {
  it('equal 1+1 roads (^985, ^988): give way at every arm, no priority', () => {
    for (const [x, y] of [
      [0, 0],
      [0, 240],
    ] as const) {
      const j = near(x, y);
      expect(j.control).toBe('right before left');
      expect(waits(j).every((w) => w === 'give way')).toBe(true);
      expect(j.arms.every((a) => a.role === null)).toBe(true);
    }
  });

  it('a 1+1 side road meets a 2+2 road (^986): the wider is major, the small arms minor, nobody gets a line', () => {
    for (const [x, y] of [
      [260, 0],
      [260, 240],
    ] as const) {
      const j = near(x, y);
      expect(j.control).toBe('priority');
      expect(j.arms.some((a) => a.role === 'major')).toBe(true);
      expect(j.arms.some((a) => a.role === 'minor')).toBe(true);
      expect(waits(j).every((w) => w === null)).toBe(true);
    }
  });

  it('a minor arm with turn lanes side by side is not small: traffic lights (^987)', () => {
    const j = near(520, 0);
    expect(j.control).toBe('traffic lights');
  });

  it('equal roads of more than 1+1: traffic lights, every arm stops at a line (^990)', () => {
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

import { describe, expect, it } from 'vitest';
import { graphOf } from '../testing/graphHelpers';
import { junctionGround } from '../testing/junctionGround';
import { junctionLabels, junctionNodes, manoeuvreOf, type JunctionNode } from './manoeuvres';

const H = Math.PI / 2;
type N = [number, number, number];
const one = (a: N, b: N) => {
  const g = graphOf([a, b], [[0, 1, null]]);
  return manoeuvreOf(g, g.edges[0]!);
};

describe('what a segment does, as it is travelled (^1006)', () => {
  it('straight, shifts, turns and a u-turn', () => {
    expect(one([0, 0, 0], [20, 0, 0])).toBe('straight');
    expect(one([0, 0, 0], [40, 3, 0])).toBe('shift right');
    expect(one([0, 0, 0], [40, -3, 0])).toBe('shift left');
    expect(one([0, 0, 0], [20, 20, H])).toBe('right turn');
    expect(one([0, 0, 0], [20, -20, -H])).toBe('left turn');
    expect(one([0, 0, 0], [0, 20, Math.PI])).toBe('u-turn');
  });
});

const ground = junctionGround();
const nodes = junctionNodes(ground);
const at = (x: number, y: number): JunctionNode =>
  nodes.find((j) => Math.abs(j.node.x - x) < 0.01 && Math.abs(j.node.y - y) < 0.01)!;
const said = (j: JunctionNode) =>
  j.roles.map((r) => `${r.way} ${r.main ? 'main' : (r.lane ?? r.manoeuvre)}`).sort();

describe('splits and merges of the testing ground (^1007 to ^1009)', () => {
  it('T-junction ^985: the main road pulls through, the side road leaves it to the right', () => {
    const j = at(-6, 1.5);
    expect([j.kind, j.equal]).toEqual(['split', false]);
    expect(said(j)).toEqual(['in main', 'out main', 'out right turn']);
  });

  it('T-junction ^985: the side road splits into a left and a right turn as equals', () => {
    const j = at(1.5, 6);
    expect([j.kind, j.equal]).toEqual(['split', true]);
    expect(said(j)).toEqual(['in straight', 'out left turn', 'out right turn']);
  });

  it('lane drop and gain ^991: a narrowing merges into the main lane, an extension leaves it', () => {
    expect(said(at(-30, 480))).toEqual(['in main', 'in narrowing', 'out main']);
    expect(at(-30, 480).kind).toBe('merge');
    expect(said(at(30, 480))).toEqual(['in main', 'out extension', 'out main']);
  });

  it('ramps ^992: the on-ramp is a narrowing, the off-ramp an extension', () => {
    expect(said(at(240, 483))).toEqual(['in main', 'in narrowing', 'out main']);
    expect(said(at(280, 483))).toEqual(['in main', 'out extension', 'out main']);
  });

  it('roundabout ^996: the ring pulls through (one circle), an arm joins it with a right turn', () => {
    const entries = nodes.filter(
      (j) => Math.hypot(j.node.x - 520, j.node.y - 720) < 14.01 && j.kind === 'merge',
    );
    expect(entries).toHaveLength(4);
    for (const j of entries) expect(said(j)).toEqual(['in main', 'in right turn', 'out main']);
  });
});

describe('the labels of the debug layer (^1010)', () => {
  it('one under every node of a split or merge', () => {
    const labels = junctionLabels(ground);
    expect(labels).toHaveLength(nodes.length);
    expect(labels.some((l) => l.text === 'split, equal')).toBe(true);
    expect(labels.some((l) => l.text === 'merge')).toBe(true);
  });
});

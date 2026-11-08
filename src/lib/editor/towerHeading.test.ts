import { describe, expect, it } from 'vitest';
import { nodeOf } from '../model/graph';
import { graphOf } from '../testing/graphHelpers';
import { at } from '../testing/editorHelpers';
import { Editor } from './editor.svelte';
import { followTowers } from './towerHeading';

const deg = (d: number) => (d * Math.PI) / 180;

const lanes = () =>
  graphOf(
    [
      [0, 0, 0],
      [40, 0, 0],
      [0, 20, 0],
      [40, 20, deg(2)],
    ],
    [
      [0, 1, null],
      [2, 3, null],
    ],
  );

describe('a node that is where a node of a tower is takes the heading of the tower (^867)', () => {
  it('dropped beside a node, with any heading, it takes the same heading, or the opposite one when that is nearer', () => {
    for (const [th, expected] of [
      [deg(2), 0],
      [deg(160), Math.PI],
      [deg(-25), 0],
    ] as const) {
      const before = lanes();
      const moved = {
        ...before,
        nodes: before.nodes.map((n) => (n.id === 3 ? { ...n, x: 40, y: 3, th } : n)),
      };
      expect(nodeOf(followTowers(before, moved), 3)!.th).toBeCloseTo(expected, 9);
    }
  });

  it('a node that only turned keeps the heading it was turned to', () => {
    const before = {
      ...lanes(),
      nodes: lanes().nodes.map((n) => (n.id === 3 ? { ...n, x: 40, y: 3, th: 0 } : n)),
    };
    const turned = {
      ...before,
      nodes: before.nodes.map((n) => (n.id === 3 ? { ...n, th: deg(30) } : n)),
    };
    expect(nodeOf(followTowers(before, turned), 3)!.th).toBe(deg(30));
  });

  it('a node that is not beside another one keeps its heading, and nodes that did not move never change', () => {
    const before = lanes();
    const moved = {
      ...before,
      nodes: before.nodes.map((n) => (n.id === 3 ? { ...n, x: 40, y: 10, th: deg(2) } : n)),
    };
    expect(nodeOf(followTowers(before, moved), 3)!.th).toBe(deg(2));
    expect(followTowers(before, before)).toBe(before);
  });
});

describe('and in the editor (^867)', () => {
  it("dropped beside a node with the pointer, the heading is the tower's", () => {
    const ed = new Editor();
    ed.load(lanes());
    const look = (x: number, y: number) => at(x, y, { ctrl: true, scale: 20 });
    ed.pointerDown(look(40, 20));
    ed.pointerMove(look(40, 15));
    ed.pointerMove(look(40, 3));
    ed.pointerUp();
    const n = nodeOf(ed.graph, 3)!;
    expect([n.x, n.y]).toEqual([40, 3]);
    expect(n.th).toBeCloseTo(0, 12);
    ed.key('z', { ctrl: true, shift: false });
    expect(nodeOf(ed.graph, 3)!.th).toBeCloseTo(deg(2), 12);
  });
});

import { describe, expect, it } from 'vitest';
import { edgeOfId } from '../model/graph';
import { graphOf } from '../testing/graphHelpers';
import { at } from '../testing/editorHelpers';
import { Editor } from './editor.svelte';
import { parallel } from './parallel';

const TH = 2 * Math.atan2(20, 30);
// The lane beside a bend of 30 m by 20 m, turning by 0.5 rad: its end node is on the normal of the end node, one lane width away.
const beside = { x: 30 + 3 * Math.sin(TH), y: 20 - 3 * Math.cos(TH) };
const lanes = () =>
  graphOf(
    [
      [0, 0, 0],
      [30, 20, TH],
      [0, -3, 0],
      [60, 40, TH],
    ],
    [
      [0, 1, null],
      [2, 3, 8],
    ],
  );

const dropAt = (to: { x: number; y: number }, via = { x: 45, y: 30 }) => {
  const ed = new Editor();
  ed.load(lanes());
  const look = (x: number, y: number) => at(x, y, { ctrl: true, scale: 20 });
  ed.pointerDown(look(60, 40));
  ed.pointerMove(look(via.x, via.y));
  ed.pointerMove(look(to.x, to.y));
  ed.pointerUp();
  return ed;
};

describe('a node dropped beside another one gives its segment the concentric radius (^877)', () => {
  it('whatever radius it had, stored or not, so that the two are parallel at once', () => {
    const g0 = lanes();
    expect(parallel(g0, edgeOfId(g0, 0)!, edgeOfId(g0, 1)!)).toBe(false);
    const ed = dropAt(beside);
    const g = ed.graph;
    expect(parallel(g, edgeOfId(g, 0)!, edgeOfId(g, 1)!)).toBe(true);
    expect(edgeOfId(g, 1)!.radius).not.toBe(8);
  });

  it('in one step: undo gives back the node and the radius', () => {
    const ed = dropAt(beside);
    ed.key('z', { ctrl: true, shift: false });
    expect(edgeOfId(ed.graph, 1)!.radius).toBe(8);
  });

  it('a node that is somewhere else leaves the radius as it is', () => {
    expect(edgeOfId(dropAt({ x: 48, y: 30 }, { x: 50, y: 35 }).graph, 1)!.radius).toBe(8);
  });
});

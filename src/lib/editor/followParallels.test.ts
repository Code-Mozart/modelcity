import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromFile } from '../project/file';
import { curveOfEdge } from './chains';
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

const project = () =>
  fromFile(
    JSON.parse(readFileSync(new URL('../../../docs/mocks/hat886.json', import.meta.url), 'utf8')),
  ).graph;
const arcOf = (g: ReturnType<typeof project>, id: number) =>
  curveOfEdge(g, id)!.pieces.find((p) => p.type === 'arc') as {
    c: { x: number; y: number };
    r: number;
  };

describe('anywhere on the offset curve, not only at the node of a tower (^877)', () => {
  const drag = (to: { x: number; y: number }, ctrl = false) => {
    const ed = new Editor();
    ed.load(project());
    const look = (x: number, y: number) => at(x, y, { ctrl, scale: 20 });
    ed.pointerDown(look(23.13, -38.625));
    ed.pointerMove(look(30, -36));
    ed.pointerMove(look(to.x, to.y));
    ed.pointerUp();
    return ed;
  };
  it('the project ^886: node 3 dragged onto the offset curve of the bend makes its segment concentric', () => {
    const ed = drag({ x: 52.369, y: -24.895 });
    const [big, small] = [arcOf(ed.graph, 0), arcOf(ed.graph, 1)];
    expect(Math.hypot(big.c.x - small.c.x, big.c.y - small.c.y)).toBeLessThan(0.01);
    expect(Math.abs(big.r - small.r)).toBeCloseTo(3, 2);
  });
});

describe('not when several nodes move, and in extend mode (^877)', () => {
  it('not when several nodes move together', () => {
    const ed = new Editor();
    ed.load(project());
    ed.selection = [2, 3];
    const look = (x: number, y: number) => at(x, y, { ctrl: true, scale: 20 });
    ed.pointerDown(look(23.13, -38.625));
    ed.pointerMove(look(30, -36));
    ed.pointerMove(look(52.369, -24.895));
    ed.pointerUp();
    expect(edgeOfId(ed.graph, 1)!.radius).toBeNull();
  });

  it('in extend mode: a segment drawn to a place on the offset curve is concentric', () => {
    const g = project();
    const lone = {
      ...g,
      edges: g.edges.filter((e) => e.id === 0),
      nodes: g.nodes.filter((n) => n.id !== 3),
    };
    const ed = new Editor();
    ed.load(lone);
    ed.enterDrawMode();
    const look = (x: number, y: number) => at(x, y, { ctrl: false, scale: 20 });
    ed.pointerMove(look(9.232, -38.625));
    ed.pointerDown(look(9.232, -38.625));
    ed.pointerUp();
    ed.pointerMove(look(52.369, -24.895));
    ed.pointerDown(look(52.369, -24.895));
    ed.pointerUp();
    const made = ed.graph.edges.find((e) => e.id !== 0)!;
    const [big, small] = [arcOf(ed.graph, 0), arcOf(ed.graph, made.id)];
    expect(Math.hypot(big.c.x - small.c.x, big.c.y - small.c.y)).toBeLessThan(0.01);
  });
});

describe('the preview shows it (^877)', () => {
  it('while a node is dragged onto the offset curve, the segment already has the concentric arc', () => {
    const ed = new Editor();
    ed.load(project());
    const look = (x: number, y: number) => at(x, y, { ctrl: false, scale: 20 });
    ed.pointerDown(look(23.13, -38.625));
    ed.pointerMove(look(30, -36));
    ed.pointerMove(look(52.369, -24.895));
    const [big, small] = [arcOf(ed.graph, 0), arcOf(ed.graph, 1)];
    expect(Math.hypot(big.c.x - small.c.x, big.c.y - small.c.y)).toBeLessThan(0.01);
  });

  it('in extend mode, the preview has the radius that is built', () => {
    const g = project();
    const lone = {
      ...g,
      edges: g.edges.filter((e) => e.id === 0),
      nodes: g.nodes.filter((n) => n.id !== 3),
    };
    const ed = new Editor();
    ed.load(lone);
    ed.enterDrawMode();
    const look = (x: number, y: number) => at(x, y, { ctrl: false, scale: 20 });
    ed.pointerMove(look(9.232, -38.625));
    ed.pointerDown(look(9.232, -38.625));
    ed.pointerUp();
    ed.pointerMove(look(52.369, -24.895));
    const shown = ed.hover?.kind === 'preview' ? ed.hover.radius : undefined;
    ed.pointerDown(look(52.369, -24.895));
    ed.pointerUp();
    const made = ed.graph.edges.find((e) => e.id !== 0)!;
    expect(shown).not.toBeNull();
    expect(shown).toBeCloseTo(made.radius!, 6);
  });
});

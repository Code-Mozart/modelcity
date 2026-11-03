import { describe, expect, it } from 'vitest';
import { Editor } from './editor.svelte';
import { nodeOf } from '../model/graph';
import { drag, drawMode, mapOf, snapping } from '../testing/snapHelpers';
import { at } from '../testing/editorHelpers';

const g = () =>
  mapOf([
    [
      [0, 0],
      [40, 0],
    ],
  ]);
const two = () =>
  mapOf([
    [
      [0, 0],
      [40, 0],
    ],
    [
      [30, 30],
      [60, 30],
    ],
  ]);
const heading = (x: number) => ((x + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;

describe('a node beside another touches it and gets a heading (^254, ^253, ^301)', () => {
  it('on the right the lane runs the same way, on the left the opposite way', () => {
    const ed = drawMode(g());
    ed.pointerMove(snapping(0.4, 3.3));
    expect(ed.hover).toMatchObject({ kind: 'preview', node: { x: 0, y: 3, th: 0 } });
    ed.pointerMove(snapping(0.4, -3.3));
    const left = ed.hover?.kind === 'preview' ? ed.hover.node : null;
    expect(left).toMatchObject({ x: 0, y: -3 });
    expect(Math.abs(heading(left!.th))).toBeCloseTo(Math.PI);
  });

  it('Alt takes the other one, and the placed node has it', () => {
    const ed = drawMode(g());
    ed.pointerMove(snapping(0.4, 3.3));
    ed.modifiers({ alt: true, shift: false });
    ed.pointerMove({ ...snapping(0.4, 3.3), alt: true });
    ed.pointerDown({ ...snapping(0.4, 3.3), alt: true });
    ed.pointerUp();
    expect(Math.abs(heading(ed.graph.nodes.at(-1)!.th))).toBeCloseTo(Math.PI);
  });

  it('a node that is moved there takes the heading too', () => {
    const ed = new Editor();
    ed.load(two());
    drag(ed, [30, 30], [0.4, -3.3]);
    const moved = nodeOf(ed.graph, 2)!;
    expect(moved).toMatchObject({ x: 0, y: -3 });
    expect(Math.abs(heading(moved.th))).toBeCloseTo(Math.PI);
  });

  it('Ctrl: no snap, no heading', () => {
    const ed = drawMode(g());
    ed.pointerMove(at(0.4, 3.3));
    expect(ed.hover).toMatchObject({ kind: 'preview', node: { x: 0.4, y: 3.3 } });
  });
});

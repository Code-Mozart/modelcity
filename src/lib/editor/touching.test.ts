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
});

describe('a node that is moved there (^254, ^888)', () => {
  it('takes the heading too, the way that turns its segment less (^888), Alt the other one', () => {
    const ed = new Editor();
    ed.load(two());
    drag(ed, [30, 30], [0.4, -3.3]);
    const moved = nodeOf(ed.graph, 2)!;
    expect(moved).toMatchObject({ x: 0, y: -3 });
    // Its segment runs east to a node that heads east: the oncoming lane of the rule would make a hook.
    expect(heading(moved.th)).toBeCloseTo(0);
    const flipped = new Editor();
    flipped.load(two());
    flipped.modifiers({ alt: true, shift: false });
    flipped.pointerDown({ ...snapping(30, 30), alt: true });
    flipped.pointerMove({ ...snapping(20, 20), alt: true });
    flipped.pointerMove({ ...snapping(0.4, -3.3), alt: true });
    flipped.pointerUp();
    expect(Math.abs(heading(nodeOf(flipped.graph, 2)!.th))).toBeCloseTo(Math.PI);
  });

  it('Ctrl: no snap, no heading', () => {
    const ed = drawMode(g());
    ed.pointerMove(at(0.4, 3.3));
    expect(ed.hover).toMatchObject({ kind: 'preview', node: { x: 0.4, y: 3.3 } });
  });
});

describe('Shift on a click that places a node (^358)', () => {
  it('keeps only the position: the node gets its automatic heading', () => {
    const ed = drawMode(g());
    const lane = (shift: boolean) => ({ ...snapping(0.4, -3.3), shift });
    ed.pointerMove(lane(false));
    const copied = ed.hover?.kind === 'preview' ? ed.hover.node : null;
    expect(Math.abs(heading(copied!.th))).toBeCloseTo(Math.PI);
    ed.pointerMove(lane(true));
    const only = ed.hover?.kind === 'preview' ? ed.hover.node : null;
    expect(only).toMatchObject({ x: 0, y: -3, th: 0 });
    ed.pointerDown(lane(true));
    ed.pointerUp();
    expect(ed.graph.nodes.at(-1)).toMatchObject({ x: 0, y: -3, th: 0 });
  });
});

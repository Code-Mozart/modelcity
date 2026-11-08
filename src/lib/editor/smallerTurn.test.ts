import { describe, expect, it } from 'vitest';
import { nearerWay } from '../snap/heading';
import { drawMode, mapOf, snapping } from '../testing/snapHelpers';

const heading = (x: number) => ((x + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;

describe('the snapped heading turns the segment the smaller way (^888)', () => {
  it('of a heading and the opposite one, the one that turns less from the headings of the neighbours', () => {
    expect(nearerWay(Math.PI, [0])).toBeCloseTo(Math.PI * 2);
    expect(heading(nearerWay(Math.PI, [0]))).toBeCloseTo(0);
    expect(nearerWay(0.3, [0])).toBe(0.3);
    expect(nearerWay(0.3, [])).toBe(0.3);
    // Two neighbours that disagree: the sum of the turns decides.
    expect(heading(nearerWay(Math.PI, [0.2, -0.1, 3]))).toBeCloseTo(0);
  });
});

describe('in extend mode (^888)', () => {
  it('extend mode: the preview of a node beside a lane keeps the way of the segment, Alt makes the hook', () => {
    const ed = drawMode(
      mapOf([
        [
          [0, 0],
          [40, 0],
        ],
        [
          [0, 30],
          [40, 30],
        ],
      ]),
    );
    // Extend from the end of the second road, then point beside the first one, on the side where its lane runs the other way.
    ed.pointerMove(snapping(40, 30));
    ed.pointerDown(snapping(40, 30));
    ed.pointerUp();
    ed.pointerMove(snapping(40.2, -3.2));
    const th = ed.hover?.kind === 'preview' ? ed.hover.node.th : null;
    expect(ed.hover).toMatchObject({ kind: 'preview', node: { x: 40, y: -3 } });
    expect(Math.abs(heading(th!))).toBeCloseTo(0);
    ed.modifiers({ alt: true, shift: false });
    ed.pointerMove({ ...snapping(40.2, -3.2), alt: true });
    const flipped = ed.hover?.kind === 'preview' ? ed.hover.node.th : null;
    expect(Math.abs(heading(flipped!))).toBeCloseTo(Math.PI);
  });
});

describe('a node with no segment (^888)', () => {
  it('a first node, with no segment, still gets the heading of the lane', () => {
    const ed = drawMode(
      mapOf([
        [
          [0, 0],
          [40, 0],
        ],
      ]),
    );
    ed.pointerMove(snapping(0.4, -3.3));
    const th = ed.hover?.kind === 'preview' ? ed.hover.node.th : null;
    expect(Math.abs(heading(th!))).toBeCloseTo(Math.PI);
  });
});

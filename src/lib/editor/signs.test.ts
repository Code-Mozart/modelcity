import { describe, expect, it } from 'vitest';
import { curveOfEdge } from './chains';
import { alongLoop, loopLength } from '../curves/along';
import { junctionGround } from '../testing/junctionGround';
import { segmentSigns, signName, signOf, type Sign } from './signs';

const g = junctionGround();
const node = (x: number, y: number) =>
  g.nodes.find((n) => Math.abs(n.x - x) < 0.01 && Math.abs(n.y - y) < 0.01)!.id;
/** The segment between two places. */
const seg = (from: [number, number], to: [number, number]) =>
  g.edges.find((e) => e.start === node(...from) && e.end === node(...to))!;
const say = (s: Sign) =>
  s.kind === 'directions'
    ? [s.straight && 'straight', s.left && 'left', s.right && 'right'].filter(Boolean).join('+')
    : `${s.kind} ${s.side}`;
const sign = (from: [number, number], to: [number, number]) => say(signOf(g, seg(from, to)));

describe('the sign of a segment, T-junction ^985 (^1012, ^1013)', () => {
  it('the main road towards the junction: straight and right, or straight and left', () => {
    expect(sign([-86, 1.5], [-6, 1.5])).toBe('straight+right');
    expect(sign([86, -1.5], [6, -1.5])).toBe('straight+left');
  });

  it('the side road towards the junction: a split to the left and the right', () => {
    expect(sign([1.5, 86], [1.5, 6])).toBe('left+right');
  });

  it('a turn is the leg of the merge it ends in: from the right a right turn, from the left a left turn', () => {
    expect(sign([-6, 1.5], [-1.5, 6])).toBe('right');
    expect(sign([6, -1.5], [-1.5, 6])).toBe('left');
  });

  it('straight across, and a road that leaves the junction: straight', () => {
    expect(sign([-6, 1.5], [6, 1.5])).toBe('straight');
    expect(sign([6, 1.5], [86, 1.5])).toBe('straight');
  });
});

describe('the sign of a segment, other cases', () => {
  it('X-junction ^988: straight, right and left', () => {
    expect(sign([-86, 241.5], [-6, 241.5])).toBe('straight+left+right');
  });

  it('lane drop and gain ^991: the lane that ends merges into the left, a lane is added on the right', () => {
    expect(sign([-70, 483], [-30, 480])).toBe('merge left');
    expect(sign([-110, 483], [-70, 483])).toBe('merge left');
    expect(sign([-30, 480], [30, 480])).toBe('extension right');
  });

  it('turn pocket ^987: the lanes part before the junction, a lane is added on the right', () => {
    expect(sign([609, -1.5], [579, -1.5])).toBe('extension right');
  });

  it('fork ^993: a split', () => {
    expect(sign([434, 481.5], [514, 481.5])).toBe('left+right');
  });
});

describe('the signs of the debug layer (^1015)', () => {
  it('one for every segment, at its middle', () => {
    const signs = segmentSigns(g);
    expect(signs).toHaveLength(g.edges.length);
    const e = g.edges[0]!;
    const pieces = curveOfEdge(g, e.id)!.pieces;
    const mid = alongLoop(pieces, loopLength(pieces) / 2)!;
    expect(signs[0]!.at).toEqual({ x: mid.x, y: mid.y });
  });
});

describe('the name of a sign (^1017)', () => {
  it('says what it is and the German sign it is after', () => {
    const name = (from: [number, number], to: [number, number]) =>
      signName(signOf(g, seg(from, to)));
    expect(name([-86, 1.5], [-6, 1.5])).toBe('straight and right (214)');
    expect(name([1.5, 86], [1.5, 6])).toBe('split (214-30)');
    expect(name([-6, 1.5], [-1.5, 6])).toBe('right (209)');
    expect(name([-70, 483], [-30, 480])).toBe('merge into left (after 531-10)');
    expect(name([-30, 480], [30, 480])).toBe('extension right (after 541-20)');
    expect(name([6, 1.5], [86, 1.5])).toBe('straight (209-30)');
  });
});

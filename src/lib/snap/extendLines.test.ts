import { describe, expect, it } from 'vitest';
import { autoHeadingFor } from '../model/junction';
import { extendRules } from './rules';
import type { SnapCurve } from './types';

const node = { id: 1, x: 0, y: 0, th: 0 };
const lines = () => extendRules(node).filter((s): s is SnapCurve => s.kind === 'curve');
const deg = (r: number) => (r * 180) / Math.PI;

describe('the extend lines are 7.5° apart (^483)', () => {
  it('7.5° to 82.5° to either side of the heading, 22 lines', () => {
    const names = lines().map((s) => s.rule);
    expect(names).toHaveLength(22);
    expect(names).toEqual(
      expect.arrayContaining(['extend+7.5', 'extend-7.5', 'extend+45', 'extend+82.5']),
    );
    expect(names).not.toContain('extend+90');
  });

  it('each line leaves the node at its angle', () => {
    for (const s of lines()) {
      const piece = s.pieces[0];
      if (piece?.type !== 'line') throw new Error('a line');
      const angle = deg(Math.atan2(piece.Q.y - piece.P.y, piece.Q.x - piece.P.x));
      const want = Number(s.rule.slice('extend'.length));
      // a line has no forward: the angle is the same modulo 180°
      expect((((angle - want) % 180) + 180) % 180).toBeCloseTo(0, 6);
    }
  });

  it('a curve that leaves the node at the angle α to its chord turns by 2α', () => {
    // The chord at 45°: the automatic heading of the new node is 90° off the heading of the first.
    const at = { x: 20 * Math.cos(Math.PI / 4), y: 20 * Math.sin(Math.PI / 4) };
    expect(deg(autoHeadingFor('end')(node, at))).toBeCloseTo(90, 6);
    // and at the normal line (90°) it is a half circle: 180°
    expect(Math.abs(deg(autoHeadingFor('end')(node, { x: 0, y: 20 })))).toBeCloseTo(180, 6);
  });
});

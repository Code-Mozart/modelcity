import { crossings } from './geometry';
import { line } from '../curves/piece';
import { add, mul, type Vec } from '../curves/vec';
import { RANK, type SnapCurve, type SnapPoint } from './types';

/** Where an offset curve crosses a line of a node (its normal, say), a node would touch the segment there, in a tower, or a radius point be concentric: an offset snap point (^880); else a crossing is computed and ranks last. */
const crossingRank = (a: SnapCurve, b: SnapCurve) =>
  [a, b].some((c) => c.rule === 'offset') && [a, b].some((c) => c.limited && c.straight)
    ? RANK.offset
    : RANK.crossing;

const isExtend = (c: SnapCurve) => c.rule.startsWith('extend');

/** The places where the near curves cross (^280), as points. */
export function crossingPoints(near: { s: SnapCurve }[]): SnapPoint[] {
  const out: SnapPoint[] = [];
  near.forEach(({ s: a }, i) => {
    for (const { s: b } of near.slice(i + 1)) {
      const from = [...new Set([...a.from, ...b.from])];
      for (const at of crossings(a.pieces, b.pieces)) {
        out.push({
          kind: 'point',
          at,
          heading: null,
          rule: 'crossing',
          from,
          rank: crossingRank(a, b),
          ...(isExtend(a) && isExtend(b) ? { quiet: true } : {}),
        });
      }
    }
  });
  return out;
}

const FAR_M = 1e5;

/** The places where the curves cross the line a control point moves along (^830). */
export function crossingsWithLine(curves: SnapCurve[], on: { p: Vec; d: Vec }): SnapPoint[] {
  const along = line(add(on.p, mul(on.d, -FAR_M)), add(on.p, mul(on.d, FAR_M)));
  return curves.flatMap((c) =>
    crossings(c.pieces, [along]).map((at): SnapPoint => ({
      kind: 'point',
      at,
      heading: null,
      rule: 'crossing',
      from: c.from,
      rank: RANK.crossing,
    })),
  );
}

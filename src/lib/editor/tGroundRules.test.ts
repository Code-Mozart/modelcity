import { describe, expect, it } from 'vitest';
import { T_CASES, tGround } from '../testing/tGround';
import { laneFactsOf } from './laneFacts';
import { waitLines } from './priorityMarks';

const g = tGround();
const facts = laneFactsOf(g);
const of = (hat: number) => {
  const c = T_CASES.find((x) => x.hat === hat)!.views[0]!.center;
  return facts.filter((f) => Math.abs(f.node.x - c.x) < 55 && Math.abs(f.node.y - c.y) < 45);
};
const seen = (hat: number) => {
  const mine = of(hat);
  return {
    lanes: mine.length,
    lines: waitLines(mine).length,
    arrows: mine
      .filter((f) => f.incomplete)
      .map((f) => f.incomplete!.join('+'))
      .sort(),
  };
};

/**
 * What the rules give on the testing ground of the small T-junctions (^1109): the happy path and
 * the edge cases. Each row is [lanes in found, give-way lines, arrows]. Rows marked `?` are what
 * the rules give and a judgement of the user is still wanted (^1101): they pin the behaviour so
 * that a change shows.
 */
const ROWS: [number, number, number, string[], string?][] = [
  [1109, 3, 2, [], 'the plain T'],
  [1110, 3, 0, [], 'nothing behind the stop nodes: no line over the void'],
  [1111, 3, 2, [], 'short roads behind'],
  [1112, 3, 2, [], 'stops of an arm that do not touch'],
  [1113, 3, 2, [], 'stops of the main road that do not touch'],
  [1114, 3, 2, [], 'the side road moved'],
  [1115, 3, 2, [], 'side road at 45 degrees'],
  [1116, 3, 2, [], 'side road at 120 degrees'],
  [1117, 3, 2, [], 'a fork at 30 degrees'],
  [1118, 3, 2, [], 'on a bend, inside'],
  [1119, 3, 2, [], 'on a bend, outside'],
  [1120, 3, 2, [], 'on a tight bend'],
  [1121, 2, 1, [], '? the main road one way: only the west lane gives way'],
  [1122, 3, 2, [], 'the side road one way in'],
  [1123, 2, 0, [], 'the side road one way out: nobody comes from it'],
  [1124, 2, 1, [], '? every arm one way: the west lane gives way to the side road'],
  [1125, 3, 1, ['right'], 'no west to east'],
  [1126, 3, 2, ['ahead'], 'no west to the side road'],
  [1127, 3, 2, ['left'], 'no east to west'],
  [1128, 3, 2, ['ahead'], 'no east to the side road'],
  [1129, 3, 1, ['right'], 'no side road to west'],
  [1130, 3, 2, ['left'], 'no side road to east'],
  [1131, 2, 1, [], '? the west lane leads nowhere'],
  [1132, 2, 1, [], '? the east lane leads nowhere'],
  [1133, 2, 0, [], '? the side road leads nowhere'],
  [1134, 3, 2, ['ahead', 'left'], 'two turns missing at two arms: an arrow on each'],
  [1135, 6, 4, [], 'two T-junctions near each other'],
  [1136, 3, 2, [], 'a bend and an angle'],
  [1137, 2, 0, [], 'a bare T with a missing turn: no arrow over the void'],
  [1138, 3, 2, [], 'long junction segments'],
  [1139, 3, 2, [], 'short junction segments'],
];

describe('the small T-junctions, happy path and edge cases (^1109)', () => {
  it('has a row for every case', () => {
    expect(ROWS.map((r) => r[0])).toEqual(T_CASES.map((c) => c.hat));
  });

  for (const [hat, lanes, lines, arrows, what] of ROWS) {
    it(`^${hat}: ${what}`, () => {
      expect(seen(hat)).toEqual({ lanes, lines, arrows });
    });
  }
});

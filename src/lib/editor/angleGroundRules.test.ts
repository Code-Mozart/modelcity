import { describe, expect, it } from 'vitest';
import { ANGLE_CASES, angleGround } from '../testing/angleGround';
import { laneFactsOf } from './laneFacts';
import { waitLines } from './priorityMarks';

const facts = laneFactsOf(angleGround());
const seen = (hat: number) => {
  const c = ANGLE_CASES.find((x) => x.hat === hat)!.views[0]!.center;
  const mine = facts.filter((f) => Math.abs(f.node.x - c.x) < 55 && Math.abs(f.node.y - c.y) < 45);
  const arrows = mine.flatMap((f) => (f.incomplete ? [f.incomplete.join('+')] : []));
  return [hat, mine.length, waitLines(mine).length, arrows.sort().join(' ')];
};

/**
 * What the rules give on the angle ground (^1145) with "right" under 150 degrees (^1144): each row
 * is [hat, lanes in, give-way lines, arrows]. The first 27 have all turns, the others turns
 * missing (the stress test): they pin the behaviour so that a change shows.
 */
const ROWS: [number, number, number, string][] = [
  [1146, 3, 2, ''],
  [1147, 3, 2, ''],
  [1148, 3, 2, ''],
  [1149, 3, 2, ''],
  [1150, 3, 2, ''],
  [1151, 3, 1, ''],
  [1152, 3, 1, ''],
  [1153, 3, 1, ''],
  [1154, 3, 2, ''],
  [1155, 3, 2, ''],
  [1156, 3, 2, ''],
  [1157, 3, 2, ''],
  [1158, 3, 2, ''],
  [1159, 3, 3, ''],
  [1160, 3, 2, ''],
  [1161, 3, 2, ''],
  [1162, 3, 2, ''],
  [1163, 3, 2, ''],
  [1164, 3, 2, ''],
  [1165, 3, 2, ''],
  [1166, 3, 2, ''],
  [1167, 3, 3, ''],
  [1168, 3, 3, ''],
  [1169, 3, 2, ''],
  [1170, 3, 2, ''],
  [1171, 3, 2, ''],
  [1172, 3, 2, ''],
  [1173, 3, 2, 'right'],
  [1174, 3, 2, 'left'],
  [1175, 3, 2, ''],
  [1176, 3, 2, 'left'],
  [1177, 3, 2, 'ahead left'],
  [1178, 3, 1, 'ahead'],
  [1179, 3, 1, ''],
  [1180, 3, 1, 'ahead ahead left'],
  [1181, 3, 2, 'left'],
  [1182, 2, 1, ''],
  [1183, 3, 2, 'right'],
  [1184, 2, 1, ''],
  [1185, 3, 2, 'ahead'],
  [1186, 3, 2, 'right'],
  [1187, 3, 1, ''],
  [1188, 3, 2, 'ahead'],
  [1189, 3, 1, 'left right'],
  [1190, 3, 2, 'ahead'],
  [1191, 3, 1, 'right right'],
  [1192, 3, 2, 'ahead left left'],
  [1193, 3, 2, 'left'],
  [1194, 2, 1, ''],
  [1195, 3, 2, 'right'],
  [1196, 2, 0, ''],
  [1197, 3, 2, 'left'],
  [1198, 3, 1, 'right'],
  [1199, 3, 1, ''],
];

describe('the angle ground and the right of 150 degrees (^1144, ^1145)', () => {
  it.each(ROWS)('^%i: %i lanes, %i lines, arrows "%s"', (hat, lanes, lines, arrows) => {
    expect(seen(hat)).toEqual([hat, lanes, lines, arrows]);
  });

  it('a symmetric Y (120, 120) has every lane giving way to its right; a T (90, 90) two of three', () => {
    expect(seen(1167)[2]).toBe(3);
    expect(seen(1157)[2]).toBe(2);
  });
});

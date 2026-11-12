import { add, dot, fromAngle, mul, sub, type Vec } from '../curves/vec';
import type { LaneArrow } from './laneArrows';
import type { LaneFacts } from './laneFacts';

/**
 * A give-way line across a lane (Zeichen 341, *Wartelinie*; ^1074, ^1075): where it first meets
 * the traffic it gives way to, the way the lane runs there, and how wide the lane is. The line is
 * drawn a fixed distance before the place (^1051).
 */
export interface WaitLine {
  at: Vec;
  th: number;
  width: number;
}

/**
 * Where the line and the arrow of a lane stand: as far along the heading of its node as it first
 * meets traffic from its right if it gives way, else any traffic, else at the node. The place is on
 * the axis of the lane and the line stands square to it, not along the curve of a turn.
 */
function anchorOf(f: LaneFacts): { at: Vec; th: number } {
  const first = (cs: LaneFacts['conflicts']) => [...cs].sort((a, b) => a.along - b.along)[0];
  const theirs = f.conflicts.filter((c) => f.givesWay && isRight(f, c));
  const c = first(theirs) ?? first(f.conflicts);
  const ahead = fromAngle(f.node.th);
  const far = c ? Math.max(0, dot(sub(c.at, f.node), ahead)) : 0;
  return { at: add(f.node, mul(ahead, far)), th: f.node.th };
}

const isRight = (f: LaneFacts, c: LaneFacts['conflicts'][number]) =>
  (c.from.x - f.node.x) * -Math.sin(f.node.th) + (c.from.y - f.node.y) * Math.cos(f.node.th) > 0;

/** The give-way lines of the lanes that give way (^1101). */
export function waitLines(facts: LaneFacts[]): WaitLine[] {
  return facts.filter((f) => f.givesWay).map((f) => ({ ...anchorOf(f), width: f.width }));
}

/** The arrows of the lanes that do not lead everywhere that is typical (^1076, ^1100): one for the ways they do lead. */
export function incompleteArrows(facts: LaneFacts[]): LaneArrow[] {
  return facts.flatMap((f) =>
    f.incomplete
      ? [
          {
            ...anchorOf(f),
            width: f.width,
            sign: {
              kind: 'directions' as const,
              straight: f.incomplete.includes('ahead'),
              left: f.incomplete.includes('left'),
              right: f.incomplete.includes('right'),
            },
          },
        ]
      : [],
  );
}

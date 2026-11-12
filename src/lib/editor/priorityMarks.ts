import type { Vec } from '../curves/vec';
import type { LaneArrow } from './laneArrows';
import type { LaneFacts } from './laneFacts';

/**
 * A give-way line across a lane (Zeichen 341, *Wartelinie*; ^1074, ^1075): at the node the lane
 * comes in at, the way it runs there, and how wide the lane is. The line stands before the node,
 * its front edge on it (^1103).
 */
export interface WaitLine {
  at: Vec;
  th: number;
  width: number;
}

/** The node of a lane, with the way it runs there: where its line and its arrow are anchored (^1103). */
const anchorOf = (f: LaneFacts) => ({ at: { x: f.node.x, y: f.node.y } as Vec, th: f.node.th });

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

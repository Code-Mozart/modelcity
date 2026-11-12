import { describe, expect, it } from 'vitest';
import { PRIORITY_CASES, priorityGround } from '../testing/priorityGround';
import { derivedNodes, withDerived } from './derived';
import { junctionGround } from '../testing/junctionGround';
import { pointOn } from '../curves/piece';
import { markingsOf, type Marking } from './markings';
import { courseOf, junctionEdgeIds, laneFactsOf, sideOf, type LaneFacts } from './laneFacts';
import { laneHull } from './laneHull';
import { incompleteArrows, waitLines } from './priorityMarks';
import { insideLoops } from '../curves/union';
import { edgesOut, nodeOf } from '../model/graph';

const g = priorityGround();
const facts = laneFactsOf(g);

/** The facts of the lanes in of a case of the ground, by its hat. */
function of(hat: number): LaneFacts[] {
  const c = PRIORITY_CASES.find((x) => x.hat === hat)!.views[0]!.center;
  return facts.filter((f) => Math.abs(f.node.x - c.x) < 40 && Math.abs(f.node.y - c.y) < 40);
}
const way = (hat: number) => of(hat).filter((f) => f.givesWay).length;
const arrows = (hat: number) =>
  of(hat)
    .filter((f) => f.incomplete)
    .map((f) => f.incomplete!.join('+'));

describe('the side of a node and the course of a segment (^1095, ^1101)', () => {
  const node = { id: 0, x: 0, y: 0, th: 0 };
  it('is left, ahead or right of the heading line, ahead within the one tolerance for places', () => {
    expect(sideOf(node, { x: 10, y: 3 })).toBe('right');
    expect(sideOf(node, { x: 10, y: -3 })).toBe('left');
    expect(sideOf(node, { x: 10, y: 0.001 })).toBe('ahead');
  });

  it('the segments of a T (^1080): from the road, ahead and right; from the side road, left and right', () => {
    const c = PRIORITY_CASES.find((x) => x.hat === 1080)!.views[0]!.center;
    const at = (dx: number, dy: number) =>
      g.nodes.find((n) => Math.abs(n.x - c.x - dx) < 0.01 && Math.abs(n.y - c.y - dy) < 0.01)!;
    const courses = (n: { id: number }) =>
      edgesOut(g, n.id)
        .filter(
          (e) =>
            nodeOf(g, e.end)!.y !== undefined &&
            Math.hypot(nodeOf(g, e.end)!.x - c.x, nodeOf(g, e.end)!.y - c.y) < 10,
        )
        .map((e) => courseOf(g, e))
        .sort();
    expect(courses(at(-6, 1.5))).toEqual(['ahead', 'right']);
    expect(courses(at(6, -1.5))).toEqual(['ahead', 'left']);
    expect(courses(at(1.5, 6))).toEqual(['left', 'right']);
  });
});

describe('who gives way: a conflict with a lane that comes in from the right (^1101, ^1074, ^1075)', () => {
  it('a T gives way on two arms, the one with no arm to its right keeps its way (^1080, ^1081)', () => {
    expect(way(1080)).toBe(2);
    expect(way(1081)).toBe(2);
    const free = of(1080).find((f) => !f.givesWay)!.node;
    expect(free.th).toBeCloseTo(Math.PI, 5);
  });

  it('an X gives way on every arm (^1084)', () => {
    expect(way(1084)).toBe(4);
  });

  it('one-way arms: nobody comes from an arm that only leads away (^1083), and the rest still gives way (^1082, ^1085, ^1086)', () => {
    expect(way(1083)).toBe(0);
    expect(way(1082)).toBe(2);
    expect(way(1085)).toBe(2);
    expect(way(1086)).toBe(1);
  });

  it('nothing where the arms are not small (^1091)', () => {
    expect(of(1091)).toEqual([]);
  });

  it('one line for each lane that gives way, as wide as its lane', () => {
    const lines = waitLines(of(1084));
    expect(lines).toHaveLength(4);
    expect(lines.every((l) => Math.abs(l.width - 3) < 1e-9)).toBe(true);
  });
});

describe('arrows where a turn is missing (^1076, ^1100)', () => {
  it('none where every turn is there', () => {
    for (const hat of [1080, 1081, 1082, 1083, 1084, 1085, 1086]) expect(arrows(hat)).toEqual([]);
  });

  it('the side road that cannot turn right shows a left arrow, the one that cannot turn left a right arrow (^1087, ^1088)', () => {
    expect(arrows(1087)).toEqual(['left']);
    expect(arrows(1088)).toEqual(['right']);
  });

  it('an X lane that cannot turn left shows straight and right; one that cannot go straight shows right and left (^1089, ^1090)', () => {
    expect(arrows(1089)).toEqual(['ahead+right']);
    expect(arrows(1090)).toEqual(['right+left']);
  });

  it('the arrow stands at the place of the line of its lane and shows its ways', () => {
    const [arrow] = incompleteArrows(of(1087));
    expect(arrow!.sign).toEqual({ kind: 'directions', straight: false, left: true, right: false });
    const own = waitLines(of(1087)).filter(
      (l) => Math.hypot(l.at.x - arrow!.at.x, l.at.y - arrow!.at.y) < 1e-6,
    );
    expect(own).toHaveLength(1);
  });
});

describe('where the marks are anchored (^1103)', () => {
  it('the give-way line of a lane is at its node, the way it runs there', () => {
    for (const f of of(1084)) {
      const line = waitLines([f])[0]!;
      expect(line.at).toEqual({ x: f.node.x, y: f.node.y });
      expect(line.th).toBe(f.node.th);
    }
  });
});

describe('the hull round what a lane in meets, for the debug layer (^1102)', () => {
  it('is round its own segments and the lanes it meets, so a place in the middle of a T is in it', () => {
    const c = PRIORITY_CASES.find((x) => x.hat === 1080)!.views[0]!.center;
    const [west] = of(1080).filter((f) => f.node.x < c.x - 1);
    const hull = laneHull(g, west!);
    expect(hull.length).toBeGreaterThan(0);
    expect(insideLoops(hull, { x: c.x + 1, y: c.y + 1 })).toBe(true);
    expect(insideLoops(hull, { x: c.x + 1, y: c.y - 30 })).toBe(false);
  });
});

describe('no centerlines inside junctions (^1104)', () => {
  const d = withDerived(g, derivedNodes(g));
  const inside = junctionEdgeIds(g);
  const c = PRIORITY_CASES.find((x) => x.hat === 1080)!.views[0]!.center;
  /** Whether the middle of any piece of a line is in the square of the junction (the arms stop 6 m from the center). */
  const within = (m: Marking) =>
    m.pieces.some((p) => {
      const v = pointOn(p, 0.5);
      return Math.abs(v.x - c.x) < 5.9 && Math.abs(v.y - c.y) < 5.9;
    });

  const nearCenter = (m: Marking) =>
    m.pieces.some((p) => Math.hypot(p.P.x - c.x, p.P.y - c.y) < 60);

  it('a T has lines on its arms and none through it', () => {
    const lines = markingsOf(d, { physical: false, inside });
    const here = lines.filter(nearCenter);
    expect(here.length).toBeGreaterThan(0);
    expect(here.some(within)).toBe(false);
  });

  it('without the rule the lines run through it', () => {
    const lines = markingsOf(d, { physical: false });
    expect(lines.some(within)).toBe(true);
  });

  it('the segments of lanes that only cross are not inside a junction (^995)', () => {
    const ground = junctionGround();
    const ids = junctionEdgeIds(ground);
    const longAcross = (e: { start: number; end: number }) => {
      const [a, b] = [nodeOf(ground, e.start)!, nodeOf(ground, e.end)!];
      return Math.abs(a.x - 260) < 100 && Math.abs(a.y - 720) < 30 && Math.abs(b.x - a.x) > 100;
    };
    const crossing = ground.edges.filter(longAcross);
    expect(crossing.length).toBeGreaterThan(0);
    expect(crossing.every((e) => !ids.has(e.id))).toBe(true);
  });
});

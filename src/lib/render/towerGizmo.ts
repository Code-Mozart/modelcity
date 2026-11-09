import { add, mul, type Vec } from '../curves/vec';
import { applyStroke, ring, screenDir, segment, toScreen, type Frame, type Palette } from './paint';

/** A bar on the skin of the capsule of a tower, along a run of parallel segments (^350, ^820). */
export interface BarShape {
  from: Vec;
  to: Vec;
  side: Vec;
}

/** The nodes of a tower, in order across the lanes: drawn as a hollow capsule around them (^820). `derived`: all its nodes are derived (^821). */
export interface TowerCapsule {
  nodes: Vec[];
  derived: boolean;
}

/** The radius of the ends of the capsule: that of the hover ring (^820, `drawHover`), in pixels. */
export const CAPSULE_PX = 10;
/** The line of the capsule: the thinnest drawn (the grid), in pixels (^820). */
const CAPSULE_LINE_PX = 1;
/** The bars on its skin (^350, ^820): 2.5 px, chosen by the user by trying (1.4 and 2.25 were too thin to read, 4.125 and 5.5 too much). */
const BAR_PX = 2.5;

type Line2 = [Vec, Vec];

const toLine = (f: Frame, t: TowerCapsule): Line2 => [
  toScreen(f, t.nodes[0]!),
  toScreen(f, t.nodes.at(-1)!),
];

/** The distance of a point from a line segment. */
function pointToLine(p: Vec, [a, b]: Line2): number {
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const len2 = dx * dx + dy * dy;
  const t =
    len2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Whether two capsules overlap on the screen: their lines are nearer than two radii. */
const overlap = (a: Line2, b: Line2) =>
  Math.min(...a.map((p) => pointToLine(p, b)), ...b.map((p) => pointToLine(p, a))) < 2 * CAPSULE_PX;

/**
 * The derived nodes to draw (^899): one whose circle overlaps the circle of a real node on the screen is
 * left out, as the real node is there (the circles are `radius` px, that of the node dot).
 */
export function shownDerived(f: Frame, derived: Vec[], real: Vec[], radius: number): Vec[] {
  const dots = real.map((n) => toScreen(f, n));
  return derived.filter((d) => {
    const p = toScreen(f, d);
    return !dots.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 2 * radius);
  });
}

/**
 * The towers to draw (^897): a tower of derived nodes only is left
 * out where a tower with a real node overlaps it on the screen, so it depends on the zoom (a bend
 * with a short straight piece before the arc has the derived nodes of its arc ends close to the real ones).
 */
export function shownTowers(f: Frame, towers: TowerCapsule[]): TowerCapsule[] {
  const real = towers.filter((t) => !t.derived).map((t) => toLine(f, t));
  return towers.filter((t) => !t.derived || !real.some((r) => overlap(toLine(f, t), r)));
}

/**
 * A hollow capsule around the nodes of a tower (^820): a line from the first to the last node, the
 * ends rounded like the hover ring. Under the hover ring and the nodes.
 */
export function drawCapsules(f: Frame, towers: TowerCapsule[], pal: Palette) {
  for (const { nodes: t } of towers) {
    const [a, b] = [toScreen(f, t[0]!), toScreen(f, t.at(-1)!)];
    const [dx, dy] = [b.x - a.x, b.y - a.y];
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      ring(f.ctx, a, CAPSULE_PX, { color: pal.ink, width: CAPSULE_LINE_PX });
      continue;
    }
    const angle = Math.atan2(dy, dx);
    const ctx = f.ctx;
    ctx.beginPath();
    ctx.arc(b.x, b.y, CAPSULE_PX, angle - Math.PI / 2, angle + Math.PI / 2);
    ctx.arc(a.x, a.y, CAPSULE_PX, angle + Math.PI / 2, angle - Math.PI / 2);
    ctx.closePath();
    applyStroke(ctx, { color: pal.ink, width: CAPSULE_LINE_PX });
  }
}

/** The bars of the towers that are shown: a hidden tower has no bars on its skin (^897). */
export function barsOn(bars: BarShape[], all: TowerCapsule[], shown: TowerCapsule[]): BarShape[] {
  const hidden = all.filter((t) => !shown.includes(t)).flatMap((t) => t.nodes);
  return bars.filter((b) => !hidden.some((p) => p.x === b.from.x && p.y === b.from.y));
}

/** The bars, on the skin of the capsules, below the nodes so that selected nodes stay blue (^350, ^820). */
export function drawBars(f: Frame, bars: BarShape[], pal: Palette) {
  for (const { from, to, side } of bars) {
    const out = mul(screenDir(f, side), CAPSULE_PX);
    segment(f.ctx, add(toScreen(f, from), out), add(toScreen(f, to), out), {
      color: pal.ink,
      width: BAR_PX,
    });
  }
}

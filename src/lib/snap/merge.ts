import { Grid } from '../curves/grid';
import type { Piece } from '../curves/types';
import { SAME_PLACE_M, alongOrAgainst } from '../curves/tolerance';
import { angleOf, dist, dot, perp, sub, unitOr, type Vec } from '../curves/vec';
import { RANK, type SnapCurve, type SnapPoint, type Suggestion } from './types';

/**
 * Merging the suggestions that are the same (^275, ^865, ^880, ^881): points at one place, lines
 * and curves on the same line or circle; the one that ranks best stays and keeps all origins.
 */

/** A straight snap curve as a point on it and its unit direction. */
function straightOf(c: SnapCurve): { p: Vec; u: Vec } {
  const piece = c.pieces[0] as { P: Vec; Q: Vec };
  return { p: piece.P, u: unitOr(sub(piece.Q, piece.P), { x: 1, y: 0 }) };
}

/** Whether two straight snap curves are the same line, within the tolerance (^247, ^865). */
function sameLine(a: SnapCurve, b: SnapCurve): boolean {
  const [x, y] = [straightOf(a), straightOf(b)];
  const parallel = alongOrAgainst({ th: angleOf(x.u) }, { th: angleOf(y.u) });
  return parallel && Math.abs(dot(perp(y.u), sub(x.p, y.p))) < SAME_PLACE_M;
}

/** How the lines are sorted into buckets to be compared (^938): by direction (radians) and by the distance of the line from the origin (meters); a line is compared with those in the buckets next to its own, so a question costs what is alike and not all the lines. */
const DIRECTION_BUCKET = 0.002;
const OFFSET_BUCKET_M = 4;
const DIRECTIONS = Math.ceil(Math.PI / DIRECTION_BUCKET);

/** The buckets (direction, offset) of a line, as the pair of numbers of its own bucket; the direction taken modulo a half turn, so that the two ways of a line are one. */
function bucketOf(c: SnapCurve): [number, number] {
  const { p, u } = straightOf(c);
  const turn = (angleOf(u) + 2 * Math.PI) % Math.PI;
  const flat = { x: Math.cos(turn), y: Math.sin(turn) };
  return [
    Math.floor(turn / DIRECTION_BUCKET) % DIRECTIONS,
    Math.floor(dot(perp(flat), p) / OFFSET_BUCKET_M),
  ];
}

/** Two lines that coincide are one suggestion that keeps all origins and all they give (^275, ^792). */
function mergeLines(list: SnapCurve[]): SnapCurve[] {
  const out: SnapCurve[] = [];
  const buckets = new Map<string, number[]>();
  const key = (d: number, o: number) => `${(d + DIRECTIONS) % DIRECTIONS},${o}`;
  for (const c of list) {
    const [d, o] = bucketOf(c);
    const near = [-1, 0, 1].flatMap((dd) =>
      [-1, 0, 1].flatMap((oo) => buckets.get(key(d + dd, o + oo)) ?? []),
    );
    const twin = out[Math.min(...near.filter((i) => sameLine(out[i]!, c)), Infinity)];
    if (!twin) {
      out.push({ ...c, origins: [...c.origins], from: [...c.from], gives: [...(c.gives ?? [])] });
      buckets.set(key(d, o), [...(buckets.get(key(d, o)) ?? []), out.length - 1]);
    } else {
      twin.origins.push(...c.origins);
      twin.from = [...new Set([...twin.from, ...c.from])];
      twin.gives = [...(twin.gives ?? []), ...(c.gives ?? [])];
    }
  }
  return out;
}

/** Points at the same place (within the tolerance, ^865) are one suggestion (the first one wins, its heading too). */
function mergePoints(list: SnapPoint[]): SnapPoint[] {
  const out: SnapPoint[] = [];
  const grid = new Grid<number>(1);
  // The one that ranks best comes first, so it is the one that stays (^880).
  const ranked = [...list].sort((a, b) => (a.rank ?? RANK.crossing) - (b.rank ?? RANK.crossing));
  for (const p of ranked) {
    const box = {
      x0: p.at.x - SAME_PLACE_M,
      x1: p.at.x + SAME_PLACE_M,
      y0: p.at.y - SAME_PLACE_M,
      y1: p.at.y + SAME_PLACE_M,
    };
    const hit = Math.min(
      ...[...grid.near(box)].filter((i) => dist(out[i]!.at, p.at) < SAME_PLACE_M),
      Infinity,
    );
    const twin = out[hit];
    if (!twin) {
      out.push({ ...p, from: [...p.from] });
      grid.add(out.length - 1, { x0: p.at.x, x1: p.at.x, y0: p.at.y, y1: p.at.y });
    } else {
      twin.from = [...new Set([...twin.from, ...p.from])];
      twin.node ??= p.node;
    }
  }
  return out;
}

/** The line or circle a piece lies on. */
type Carrier = { line: { p: Vec; u: Vec } } | { circle: { c: Vec; r: number } };

const carrierOf = (p: Piece): Carrier =>
  p.type === 'line'
    ? { line: { p: p.P, u: unitOr(sub(p.Q, p.P), { x: 1, y: 0 }) } }
    : { circle: { c: p.c, r: p.r } };

/** Whether two carriers are the same line or circle, within the tolerance (^865): direction and side do not matter. */
function sameCarrier(a: Carrier, b: Carrier): boolean {
  if ('line' in a && 'line' in b) {
    const [x, y] = [a.line, b.line];
    return (
      alongOrAgainst({ th: angleOf(x.u) }, { th: angleOf(y.u) }) &&
      Math.abs(dot(perp(y.u), sub(x.p, y.p))) < SAME_PLACE_M
    );
  }
  if ('circle' in a && 'circle' in b)
    return (
      dist(a.circle.c, b.circle.c) < SAME_PLACE_M &&
      Math.abs(a.circle.r - b.circle.r) < SAME_PLACE_M
    );
  return false;
}

const boxes = new WeakMap<Piece[], { x0: number; x1: number; y0: number; y1: number }>();

/** A box that holds the pieces, loosely (a circle for an arc); kept for the pieces. */
function boxOf(pieces: Piece[]) {
  const known = boxes.get(pieces);
  if (known) return known;
  const box = boxAround(pieces);
  boxes.set(pieces, box);
  return box;
}

function boxAround(pieces: Piece[]) {
  const xs = pieces.flatMap((p) =>
    p.type === 'arc' ? [p.c.x - p.r, p.c.x + p.r] : [p.P.x, p.Q.x],
  );
  const ys = pieces.flatMap((p) =>
    p.type === 'arc' ? [p.c.y - p.r, p.c.y + p.r] : [p.P.y, p.Q.y],
  );
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** Whether two curves of segments lie on the same lines and circles, piece by piece, whatever their spans (^881). */
function sameCurve(a: SnapCurve, b: SnapCurve): boolean {
  const [ca, cb] = [a.pieces.map(carrierOf), b.pieces.map(carrierOf)];
  return (
    ca.every((x) => cb.some((y) => sameCarrier(x, y))) &&
    cb.every((y) => ca.some((x) => sameCarrier(x, y)))
  );
}

/** Whether two pieces are the same piece, within the tolerance. */
function samePiece(a: Piece, b: Piece): boolean {
  const [x, y] = [
    [a.P, a.Q],
    [b.P, b.Q],
  ];
  return a.type === b.type && x.every((e, i) => dist(e, y[i]!) < SAME_PLACE_M);
}

/**
 * The curves of segments and their offset curves that lie on the same lines and circles are one
 * suggestion (^881): the curve of a segment, if there is one (a node can join it, ^268), else the
 * first offset curve, which keeps all origins and nodes and covers all spans. Two curves of
 * segments stay two: each is a segment to merge into.
 */
/** The curve `c` is the same as `twin`: its origins, nodes and pieces are added to it (^881). */
function absorb(twin: SnapCurve, c: SnapCurve) {
  twin.origins.push(...c.origins);
  twin.from = [...new Set([...twin.from, ...c.from])];
  twin.pieces = [
    ...twin.pieces,
    ...c.pieces.filter((p) => !twin.pieces.some((q) => samePiece(p, q))),
  ];
}

/** The size of a cell of the grid of the boxes of snap curves (meters). */
const CURVE_CELL_M = 50;

function mergeCurves(list: SnapCurve[]): SnapCurve[] {
  const apart = (a: SnapCurve, b: SnapCurve) => {
    const [p, q] = [boxOf(a.pieces), boxOf(b.pieces)];
    const m = SAME_PLACE_M;
    return p.x1 < q.x0 - m || q.x1 < p.x0 - m || p.y1 < q.y0 - m || q.y1 < p.y0 - m;
  };
  const out: SnapCurve[] = [];
  const grid = new Grid<number>(CURVE_CELL_M);
  const numbers = new Map<SnapCurve, number>();
  const put = (c: SnapCurve, i: number) => {
    numbers.set(c, i);
    grid.add(i, boxOf(c.pieces));
  };
  for (const c of [...list].sort(
    (a, b) => Number(b.rule === 'curve') - Number(a.rule === 'curve'),
  )) {
    const box = boxOf(c.pieces);
    // Only the curves whose box is near this one's can be the same curve (^938), the first in order wins.
    const near = [
      ...grid.near({
        x0: box.x0 - SAME_PLACE_M,
        x1: box.x1 + SAME_PLACE_M,
        y0: box.y0 - SAME_PLACE_M,
        y1: box.y1 + SAME_PLACE_M,
      }),
    ].sort((a, b) => a - b);
    const twin = near
      .map((i) => out[i]!)
      .find((o) => !(o.rule === 'curve' && c.rule === 'curve') && !apart(o, c) && sameCurve(o, c));
    if (!twin) {
      out.push({ ...c, origins: [...c.origins], from: [...c.from] });
      put(out.at(-1)!, out.length - 1);
    } else {
      absorb(twin, c);
      put(twin, numbers.get(twin)!);
    }
  }
  return out;
}

/** Deduplicate: coincident snap lines and equal points are one (^275). Curves of segments stay. */
export function dedupe(list: Suggestion[]): Suggestion[] {
  const lines = list.filter((s): s is SnapCurve => s.kind === 'curve' && s.straight && s.limited);
  const points = list.filter((s): s is SnapPoint => s.kind === 'point');
  const rest = list.filter((s): s is SnapCurve => s.kind === 'curve' && !(s.straight && s.limited));
  return [...mergePoints(points), ...mergeLines(lines), ...mergeCurves(rest)];
}

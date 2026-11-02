import type { EdgeRef } from '../curves/path';
import { isDegenerate, pointOn } from '../curves/piece';
import type { Piece } from '../curves/types';
import { screenDir, toScreen, type Frame } from './paint';

/** How wide the outline of a hovered segment is across: as the hover circle of a node, 10 px in radius (^99). */
export const OUTLINE_PX = 20;
const OUTLINE_STROKE_PX = 1.6;
/** The outline is at least this much wider than the road surface (^99). */
const OUTLINE_MARGIN_PX = 8;

/**
 * An outline around a run of pieces that follow each other (^99): two lines at the same distance
 * on both sides, closed by a half circle at each end. The offset of a line is a line and that of an
 * arc an arc of another radius, so it is exact. `width` is the distance across, in pixels.
 */
export function drawOutline(f: Frame, pieces: Piece[], roadPx: number, color: string) {
  const parts = pieces.filter((p) => !isDegenerate(p));
  if (!parts.length) return;
  const d = Math.max(OUTLINE_PX, roadPx + OUTLINE_MARGIN_PX) / 2;
  const { ctx } = f;
  ctx.strokeStyle = color;
  ctx.lineWidth = OUTLINE_STROKE_PX;
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const side of [1, -1]) {
    ctx.beginPath();
    parts.forEach((piece, n) => traceSide(f, piece, side * d, n === 0));
    ctx.stroke();
  }
  cap(f, parts[0]!, 0, d);
  cap(f, parts.at(-1)!, 1, d);
}

/** One side of a piece, at a signed distance (pixels) to the left of the way it runs; `first` starts the path. */
function traceSide(f: Frame, piece: Piece, off: number, first: boolean) {
  const { ctx, view } = f;
  if (piece.type === 'line') {
    const [a, b] = [toScreen(f, piece.P), toScreen(f, piece.Q)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = { x: (-(b.y - a.y) / len) * off, y: ((b.x - a.x) / len) * off };
    if (first) ctx.moveTo(a.x + n.x, a.y + n.y);
    else ctx.lineTo(a.x + n.x, a.y + n.y);
    ctx.lineTo(b.x + n.x, b.y + n.y);
    return;
  }
  const c = toScreen(f, piece.c);
  const r = piece.r * view.scale - off * Math.sign(piece.da);
  if (r < 1) return;
  const a0 = piece.a0 + view.rot;
  ctx.arc(c.x, c.y, r, a0, a0 + piece.da, piece.da < 0);
}

/** The half circle that closes the outline at the start (`t` 0) or the end (`t` 1) of a piece. */
function cap(f: Frame, piece: Piece, t: 0 | 1, d: number) {
  const at = pointOn(piece, t);
  const dir = screenDir(f, { x: at.tx, y: at.ty });
  const angle = Math.atan2(dir.y, dir.x);
  const c = toScreen(f, at);
  const from = angle + (t === 0 ? Math.PI / 2 : -Math.PI / 2);
  f.ctx.beginPath();
  f.ctx.arc(c.x, c.y, d, from, from + Math.PI);
  f.ctx.stroke();
}

/** The roads with their edges and lane width in meters. */
interface OutlineRoad {
  edges: EdgeRef[];
  width: number;
}

/**
 * The outlines of the segments `(road, index)` (^99): segments that follow each other on a road
 * are one run, so there is only a half circle at its two ends.
 */
export function drawOutlines(
  f: Frame,
  roads: OutlineRoad[],
  segments: { road: number; i: number }[],
  color: string,
) {
  const sorted = [...segments].sort((a, b) => a.road - b.road || a.i - b.i);
  let run: { road: number; i: number }[] = [];
  const flush = () => {
    const road = roads[run[0]?.road ?? -1];
    if (road) {
      const pieces = run.flatMap(({ i }) => road.edges[i]?.E.pieces ?? []);
      drawOutline(f, pieces, road.width * f.view.scale, color);
    }
    run = [];
  };
  for (const s of sorted) {
    const last = run.at(-1);
    if (last && (last.road !== s.road || last.i + 1 !== s.i)) flush();
    run.push(s);
  }
  flush();
}

import type { Point } from '../view';

/** Small 2D vector helpers. World units are meters, y points down (^4). */
export type Vec = Point;

export const TAU = Math.PI * 2;

export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
export const cross = (a: Vec, b: Vec) => a.x * b.y - a.y * b.x;
export const len = (a: Vec) => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export const fromAngle = (th: number): Vec => ({ x: Math.cos(th), y: Math.sin(th) });
export const angleOf = (a: Vec) => Math.atan2(a.y, a.x);
/** Rotated +90 degrees (toward the left of the heading on screen with y down: clockwise). */
export const perp = (a: Vec): Vec => ({ x: -a.y, y: a.x });
export const unitOr = (a: Vec, fallback: Vec): Vec => {
  const l = len(a);
  return l > 1e-9 ? mul(a, 1 / l) : fallback;
};

export const mod = (x: number, m: number) => ((x % m) + m) % m;
export const toRad = (deg: number) => (deg * Math.PI) / 180;

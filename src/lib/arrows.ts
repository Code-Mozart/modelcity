/**
 * Arrows in the style of the node headings (a line with two barbs at the tip), as SVG path data,
 * for symbols (^50).
 */
export interface Pt {
  x: number;
  y: number;
}

/** Line width of every mouse symbol, in the 30 x 30 box: outline, arrows and chevrons alike (^59). */
export const SYMBOL_STROKE = 1.5;

const BARB_ANGLE = 0.6;

export function arrowPath(from: Pt, to: Pt, barb = 3.4): string {
  const th = Math.atan2(to.y - from.y, to.x - from.x);
  const side = (s: number) => {
    const a = th + Math.PI + s * BARB_ANGLE;
    return `M${to.x} ${to.y} L${(to.x + barb * Math.cos(a)).toFixed(2)} ${(to.y + barb * Math.sin(a)).toFixed(2)}`;
  };
  return `M${from.x} ${from.y} L${to.x} ${to.y} ${side(-1)} ${side(1)}`;
}

/** Just an arrowhead (no shaft): its tip at `tip`, pointing along `angle`, as SVG path data. */
export function chevronPath(tip: Pt, angle: number, size = 4.6, spread = 0.8): string {
  const side = (s: number) => {
    const a = angle + Math.PI + s * spread;
    return `M${tip.x} ${tip.y} L${(tip.x + size * Math.cos(a)).toFixed(2)} ${(tip.y + size * Math.sin(a)).toFixed(2)}`;
  };
  return `${side(-1)} ${side(1)}`;
}

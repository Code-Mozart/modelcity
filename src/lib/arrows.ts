/**
 * Arrows in the style of the node headings (a line with two barbs at the tip), as SVG path data,
 * for symbols (^50).
 */
export interface Pt {
  x: number;
  y: number;
}

const BARB_ANGLE = 0.5;

export function arrowPath(from: Pt, to: Pt, barb = 3.2): string {
  const th = Math.atan2(to.y - from.y, to.x - from.x);
  const side = (s: number) => {
    const a = th + Math.PI + s * BARB_ANGLE;
    return `M${to.x} ${to.y} L${(to.x + barb * Math.cos(a)).toFixed(2)} ${(to.y + barb * Math.sin(a)).toFixed(2)}`;
  };
  return `M${from.x} ${from.y} L${to.x} ${to.y} ${side(-1)} ${side(1)}`;
}

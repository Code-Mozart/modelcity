/** Whether two angles (radians) are the same direction. */
export const sameAngle = (a: number, b: number): boolean => Math.abs(Math.sin((a - b) / 2)) < 1e-3;

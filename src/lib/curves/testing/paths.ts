import type { Path } from '../path';
import { fromAngle, mul, toRad, add } from '../vec';

/** Test fixtures only: the demo's example paths (^5, Figs H and G, a hook), recentered, in meters. The app has no presets (^40). */
export type FixtureName = 'H' | 'G' | 'hook';

function twoNodes(a: [number, number, number], b: [number, number, number]): Path {
  return {
    nodes: [
      { x: a[0], y: a[1], th: toRad(a[2]) },
      { x: b[0], y: b[1], th: toRad(b[2]) },
    ],
    radii: [null],
    shapes: [null],
  };
}

/** Fig H: three edges, all single bends. */
function figH(): Path {
  const th = [52, -34, -30, 50].map(toRad) as [number, number, number, number];
  const lens = [290, 190, 430].map((l) => l / 6);
  let at = { x: -95, y: 0 };
  const nodes = [{ ...at, th: th[0] }];
  for (let i = 0; i < 3; i++) {
    const g = (th[i]! + th[i + 1]!) / 2;
    at = add(at, mul(fromAngle(g), lens[i]!));
    nodes.push({ ...at, th: th[i + 1]! });
  }
  return { nodes, radii: [null, null, null], shapes: [null, null, null] };
}

const builders: Record<FixtureName, () => Path> = {
  H: figH,
  /** Fig G: an S-curve. */
  G: () => twoNodes([-48, 13, 0], [48, -13, 0]),
  hook: () => twoNodes([25, 17, 3], [-25, -13, -75]),
};

export const fixture = (name: FixtureName): Path => builders[name]();

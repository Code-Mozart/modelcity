import { describe, expect, it } from 'vitest';
import { chainsOf } from '../editor/chains';
import { angleGround } from '../testing/angleGround';
import { connectedMap } from '../testing/samples';
import { tGround } from '../testing/tGround';
import { screenBox } from './bounds';
import { reducedAnchors } from './reducedAnchors';
import { skeletonAnchors } from './skeletonAnchors';

const random = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

describe('the few anchors of the hulls bound the content as all of its anchors do, within half a pixel (^941)', () => {
  it.each([
    ['angle ground', angleGround()],
    ['T ground', tGround()],
    ['connected map', connectedMap(12)],
  ])('%s, at random zooms and turns', (_name, g) => {
    const chains = chainsOf(g);
    const [all, few] = [skeletonAnchors(chains), reducedAnchors(chains)];
    expect(few.length).toBeLessThan(all.length);
    const next = random(3);
    for (let i = 0; i < 25; i++) {
      const view = {
        gx: 0,
        gy: 0,
        cx: next() * 400,
        cy: next() * 400,
        scale: 0.2 + next() * 6,
        rot: next() * 6.28,
      };
      const size = { width: 800, height: 600 };
      const [a, b] = [screenBox(view, size, all), screenBox(view, size, few)];
      for (const k of ['minX', 'maxX', 'minY', 'maxY'] as const) expect(b[k]).toBeCloseTo(a[k], 0);
    }
  });

  it('are about as few for a big map as for a small one', () => {
    const chains = chainsOf(connectedMap(250));
    expect(reducedAnchors(chains).length).toBeLessThan(skeletonAnchors(chains).length / 20);
  });

  it('has no anchors for an empty map', () => {
    expect(reducedAnchors([])).toEqual([]);
  });
});

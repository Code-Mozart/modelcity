import { describe, expect, it } from 'vitest';
import { boxAround, boxesMeet, type Box } from '../curves/hull';
import { pieceKey } from '../curves/memo';
import { reversePiece } from '../curves/piece';
import type { Piece } from '../curves/types';
import type { Graph } from '../model/graph';
import { angleGround } from '../testing/angleGround';
import { connectedMap } from '../testing/samples';
import { hullsOf } from './corners';
import { derivedNodes, withDerived } from './derived';
import { laneFactsOf, junctionEdgeIds } from './laneFacts';
import { markingsOf } from './markings';
import { patched, surfaceFrom } from './surface';
import { windowOf } from './windowed';

/** What the pipeline makes of a graph that is shown in a box: the pieces of the surface and of the markings that meet it, and the lane facts of nodes in it. */
function shownIn(g: Graph, view: Box) {
  const seen = withDerived(g, derivedNodes(g));
  const surface = patched(surfaceFrom(hullsOf(g)));
  const markings = markingsOf(seen, {
    physical: false,
    extra: [],
    surface,
    inside: junctionEdgeIds(g),
  });
  const keys = (pieces: Piece[]) =>
    pieces
      .filter((p) => boxesMeet(boxAround([p]), view))
      .map((p) => [pieceKey(p), pieceKey(reversePiece(p))].sort()[0]!);
  return {
    surface: surface.flatMap(keys).sort(),
    markings: markings.flatMap((m) => keys(m.pieces)).sort(),
    facts: laneFactsOf(g)
      .filter(
        (f) =>
          f.node.x >= view.x0 && f.node.x <= view.x1 && f.node.y >= view.y0 && f.node.y <= view.y1,
      )
      .map((f) => JSON.stringify(f, (_k, v) => (typeof v === 'number' ? Math.round(v * 1e6) : v)))
      .sort(),
  };
}

describe('the part of a graph in a window gives what all of it gives where it is shown (^1216)', () => {
  const room = 150;
  const views: [string, Graph, Box][] = [
    ['angle ground', angleGround(), { x0: -100, x1: 100, y0: -100, y1: 100 }],
    ['connected map', connectedMap(12), { x0: 250, x1: 500, y0: 100, y1: 350 }],
    ['connected map, other corner', connectedMap(12), { x0: -40, x1: 200, y0: -40, y1: 200 }],
  ];
  it.each(views)('%s', (_name, g, view) => {
    const window = {
      x0: view.x0 - room,
      x1: view.x1 + room,
      y0: view.y0 - room,
      y1: view.y1 + room,
    };
    const part = windowOf(g, window);
    expect(part.edges.length).toBeLessThanOrEqual(g.edges.length);
    expect(shownIn(part, view)).toEqual(shownIn(g, view));
  });

  it('is smaller than the map for a small window on a big map', () => {
    const g = connectedMap(60);
    const part = windowOf(g, { x0: 0, x1: 300, y0: 0, y1: 300 });
    expect(part.edges.length).toBeLessThan(g.edges.length / 2);
  });
});

import { describe, expect, it } from 'vitest';
import { edgesOfRoads, nearestOnRoads, removeNodeFrom, roadHandles, startRoad } from './roads';
import { fixture } from './testing/paths';

describe('roads (^40)', () => {
  it('starts a road with one node heading east', () => {
    const r = startRoad([fixture('G')], { x: 5, y: 6 });
    expect(r.road).toBe(1);
    expect(r.roads[1]).toEqual({ nodes: [{ x: 5, y: 6, th: 0 }], radii: [], shapes: [] });
  });

  it('tags handles with their road', () => {
    const roads = [fixture('G'), fixture('hook')];
    const handles = roadHandles(roads, edgesOfRoads(roads), 4);
    expect(new Set(handles.map((h) => h.road))).toEqual(new Set([0, 1]));
  });

  it('finds the nearest curve over all roads', () => {
    const roads = [
      fixture('G'),
      { ...fixture('G'), nodes: fixture('G').nodes.map((n) => ({ ...n, y: n.y + 60 })) },
    ];
    const hit = nearestOnRoads(roads, { x: 0, y: 61 }, 5);
    expect(hit?.road).toBe(1);
    expect(nearestOnRoads(roads, { x: 0, y: 200 }, 5)).toBeNull();
  });

  it('removes a node, or the whole road when fewer than two nodes would be left', () => {
    const roads = [fixture('H'), fixture('G')];
    const one = removeNodeFrom(roads, { road: 0, node: 1 }, null);
    expect(one.roads[0]!.nodes).toHaveLength(3);
    const gone = removeNodeFrom(roads, { road: 1, node: 0 }, null);
    expect(gone.roads).toHaveLength(1);
  });

  it('keeps the road being drawn with one node, and shifts the active index', () => {
    const roads = [fixture('G'), fixture('G')];
    expect(removeNodeFrom(roads, { road: 1, node: 0 }, 1).roads[1]!.nodes).toHaveLength(1);
    expect(removeNodeFrom(roads, { road: 0, node: 0 }, 1)).toMatchObject({ active: 0 });
    const lone = [startRoad([], { x: 0, y: 0 }).roads[0]!];
    expect(removeNodeFrom(lone, { road: 0, node: 0 }, 0)).toMatchObject({
      roads: [],
      active: null,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { closeOver, coincident, junctions, syncHeadings } from './junctions';
import { appendNode } from './path';
import { startRoad, replaceRoad, type Roads } from './roads';
import { withNode } from './path';

/** Road 0 runs (0,0) - (20,0) - (40,0); road 1 splits off at (20,0) to (40,20). */
function split(): Roads {
  let roads = startRoad([], { x: 0, y: 0 }).roads;
  roads = replaceRoad(roads, 0, appendNode(roads[0]!, { x: 20, y: 0 }).path);
  roads = replaceRoad(roads, 0, appendNode(roads[0]!, { x: 40, y: 0 }).path);
  const b = startRoad(roads, { x: 20, y: 0 });
  roads = replaceRoad(b.roads, 1, appendNode(b.roads[1]!, { x: 40, y: 20 }).path);
  return roads;
}

describe('shared nodes (^23)', () => {
  it('nodes at the same position are the same node', () => {
    const roads = split();
    expect(coincident(roads, { road: 0, node: 1 })).toEqual([
      { road: 0, node: 1 },
      { road: 1, node: 0 },
    ]);
    expect(coincident(roads, { road: 0, node: 0 })).toHaveLength(1);
    expect(
      closeOver(roads, [
        { road: 1, node: 0 },
        { road: 0, node: 1 },
      ]),
    ).toHaveLength(2);
  });

  it('finds the split: one edge in, two out', () => {
    expect(junctions(split())).toEqual([{ at: { road: 0, node: 1 }, incoming: 1, outgoing: 2 }]);
  });

  it('finds the merge: two edges in, one out', () => {
    const roads = split();
    const merged: Roads = [roads[0]!, { ...roads[1]!, nodes: [...roads[1]!.nodes] }];
    // road 1 now ends at (20, 0): it runs (40,20) -> (20,0), road 0 passes through it
    merged[1] = { ...merged[1]!, nodes: [merged[1]!.nodes[1]!, merged[1]!.nodes[0]!] };
    expect(junctions(merged)).toEqual([{ at: { road: 0, node: 1 }, incoming: 2, outgoing: 1 }]);
  });

  it('a heading change is copied to the shared nodes', () => {
    const roads = split();
    const turned = replaceRoad(roads, 0, withNode(roads[0]!, 1, { th: 0.5 }));
    const synced = syncHeadings(turned, 0, roads[0]!);
    expect(synced[1]!.nodes[0]!.th).toBe(0.5);
  });
});

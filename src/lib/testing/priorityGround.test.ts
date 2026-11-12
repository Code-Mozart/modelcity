import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dist } from '../curves/vec';
import { curveOfEdge } from '../editor/chains';
import { surfaceOf } from '../editor/surface';
import { fromFile, toFile, type ProjectFile } from '../project/file';
import { priorityGround } from './priorityGround';

const PATH = new URL('../../../docs/mocks/hat1078.json', import.meta.url);

/** The project file of the testing ground (^984), with fixed dates so that it only changes with the ground. */
function groundFile(): ProjectFile {
  const at = '2026-11-10T00:00:00.000Z';
  return toFile({
    title: 'small junctions testing ground (rechts vor links)',
    createdAt: at,
    lastUpdatedAt: at,
    camera: { x: 390, y: 360, scale: 1.2, rotation: 0 },
    graph: priorityGround(),
  });
}

describe('the testing ground of the small junctions (^1078)', () => {
  // `UPDATE_MOCKS=1 bunx vitest run src/lib/testing/priorityGround.test.ts` writes the file again.
  if (process.env.UPDATE_MOCKS || !existsSync(PATH)) {
    writeFileSync(PATH, JSON.stringify(groundFile()) + '\n');
  }
  const stored = JSON.parse(readFileSync(PATH, 'utf8')) as ProjectFile;

  it('the project file is what the ground makes', () => {
    expect(stored).toEqual(JSON.parse(JSON.stringify(groundFile())));
  });

  it('opens as a project, and every segment has a curve', () => {
    const { graph } = fromFile(stored);
    expect(graph.edges.length).toBeGreaterThan(80);
    expect(graph.edges.filter((e) => !curveOfEdge(graph, e.id))).toEqual([]);
  });

  it('every node has a segment, and no two nodes are at one place', () => {
    const { graph } = fromFile(stored);
    const used = new Set(graph.edges.flatMap((e) => [e.start, e.end]));
    expect(graph.nodes.filter((n) => !used.has(n.id))).toEqual([]);
    const places = new Set(graph.nodes.map((n) => `${n.x},${n.y}`));
    expect(places.size).toBe(graph.nodes.length);
  });

  it('the surface is closed loops only: no piece ends without the next one beginning there (^1002)', () => {
    const { graph } = fromFile(stored);
    for (const loop of surfaceOf(graph)) {
      loop.forEach((p, i) => {
        const next = loop[(i + 1) % loop.length]!;
        expect(dist(p.Q, next.P)).toBeLessThan(2 * SAME_PLACE_M);
      });
    }
  });
});

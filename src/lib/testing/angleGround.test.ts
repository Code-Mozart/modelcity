import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { curveOfEdge } from '../editor/chains';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dist } from '../curves/vec';
import { surfaceOf } from '../editor/surface';
import { fromFile, toFile, type ProjectFile } from '../project/file';
import { ANGLE_CASES, angleGround } from './angleGround';

const PATH = new URL('../../../docs/mocks/hat1145.json', import.meta.url);

/** The project file of the testing ground (^1145), with fixed dates so that it only changes with the ground. */
function groundFile(): ProjectFile {
  const at = '2026-11-12T00:00:00.000Z';
  return toFile({
    title: 'angles of 3-way nodes testing ground',
    createdAt: at,
    lastUpdatedAt: at,
    camera: { x: 780, y: 480, scale: 0.6, rotation: 0 },
    graph: angleGround(),
  });
}

describe('the testing ground of the angles of 3-way nodes (^1145)', () => {
  // `UPDATE_MOCKS=1 bunx vitest run src/lib/testing/angleGround.test.ts` writes the file again.
  if (process.env.UPDATE_MOCKS || !existsSync(PATH))
    writeFileSync(PATH, JSON.stringify(groundFile()) + '\n');
  const stored = JSON.parse(readFileSync(PATH, 'utf8')) as ProjectFile;

  it('the project file is what the ground makes', () => {
    expect(stored).toEqual(JSON.parse(JSON.stringify(groundFile())));
  });

  it('opens as a project, and every segment has a curve', () => {
    const { graph } = fromFile(stored);
    expect(graph.edges.length).toBeGreaterThan(300);
    expect(graph.edges.filter((e) => !curveOfEdge(graph, e.id))).toEqual([]);
  });

  it('every node has a segment, and no two nodes are at one place', () => {
    const { graph } = fromFile(stored);
    const used = new Set(graph.edges.flatMap((e) => [e.start, e.end]));
    expect(graph.nodes.filter((n) => !used.has(n.id))).toEqual([]);
    expect(new Set(graph.nodes.map((n) => `${n.x},${n.y}`)).size).toBe(graph.nodes.length);
  });

  it('the surface is closed loops only (^1002), and the cases have the hats in order', () => {
    const { graph } = fromFile(stored);
    for (const loop of surfaceOf(graph)) {
      loop.forEach((p, i) => {
        expect(dist(p.Q, loop[(i + 1) % loop.length]!.P)).toBeLessThan(2 * SAME_PLACE_M);
      });
    }
    expect(ANGLE_CASES.map((c, i) => c.hat - ANGLE_CASES[0]!.hat - i)).toEqual(
      ANGLE_CASES.map(() => 0),
    );
  });
});

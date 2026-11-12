import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { curveOfEdge } from '../editor/chains';
import { SAME_PLACE_M } from '../curves/tolerance';
import { dist } from '../curves/vec';
import { surfaceOf } from '../editor/surface';
import { fromFile, toFile, type ProjectFile } from '../project/file';
import { T_CASES, tGround } from './tGround';

const PATH = new URL('../../../docs/mocks/hat1109.json', import.meta.url);

/** The project file of the testing ground (^1109), with fixed dates so that it only changes with the ground. */
function groundFile(): ProjectFile {
  const at = '2026-11-12T00:00:00.000Z';
  return toFile({
    title: 'small T-junctions testing ground',
    createdAt: at,
    lastUpdatedAt: at,
    camera: { x: 780, y: 480, scale: 0.6, rotation: 0 },
    graph: tGround(),
  });
}

describe('the testing ground of the small T-junctions (^1109)', () => {
  // `UPDATE_MOCKS=1 bunx vitest run src/lib/testing/tGround.test.ts` writes the file again.
  if (process.env.UPDATE_MOCKS || !existsSync(PATH))
    writeFileSync(PATH, JSON.stringify(groundFile()) + '\n');
  const stored = JSON.parse(readFileSync(PATH, 'utf8')) as ProjectFile;

  it('the project file is what the ground makes', () => {
    expect(stored).toEqual(JSON.parse(JSON.stringify(groundFile())));
  });

  it('opens as a project, and every segment has a curve', () => {
    const { graph } = fromFile(stored);
    expect(graph.edges.length).toBeGreaterThan(150);
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
    expect(T_CASES.map((c, i) => c.hat - T_CASES[0]!.hat - i)).toEqual(T_CASES.map(() => 0));
  });
});

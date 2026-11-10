import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { curveOfEdge } from '../editor/chains';
import { fromFile, toFile, type ProjectFile } from '../project/file';
import { junctionGround } from './junctionGround';

const PATH = new URL('../../../docs/mocks/hat984.json', import.meta.url);

/** The project file of the testing ground (^984), with fixed dates so that it only changes with the ground. */
function groundFile(): ProjectFile {
  const at = '2026-11-10T00:00:00.000Z';
  return toFile({
    title: 'junction testing ground',
    createdAt: at,
    lastUpdatedAt: at,
    camera: { x: 260, y: 480, scale: 0.9, rotation: 0 },
    graph: junctionGround(),
  });
}

describe('the testing ground of the junctions (^984)', () => {
  // `UPDATE_MOCKS=1 bunx vitest run src/lib/testing/junctionGround.test.ts` writes the file again.
  if (process.env.UPDATE_MOCKS || !existsSync(PATH)) {
    writeFileSync(PATH, JSON.stringify(groundFile()) + '\n');
  }
  const stored = JSON.parse(readFileSync(PATH, 'utf8')) as ProjectFile;

  it('the project file is what the ground makes', () => {
    expect(stored).toEqual(JSON.parse(JSON.stringify(groundFile())));
  });

  it('opens as a project, and every segment has a curve', () => {
    const { graph } = fromFile(stored);
    expect(graph.edges.length).toBeGreaterThan(250);
    expect(graph.edges.filter((e) => !curveOfEdge(graph, e.id))).toEqual([]);
  });

  it('every node has a segment, and no two nodes are at one place', () => {
    const { graph } = fromFile(stored);
    const used = new Set(graph.edges.flatMap((e) => [e.start, e.end]));
    expect(graph.nodes.filter((n) => !used.has(n.id))).toEqual([]);
    const places = new Set(graph.nodes.map((n) => `${n.x},${n.y}`));
    expect(places.size).toBe(graph.nodes.length);
  });
});

import { describe, expect, it } from 'vitest';
import { addEdge, addNode, emptyGraph, shareRadius } from '../model/graph';
import { fromFile, toFile, FILE_VERSION, ProjectFileError, type Project } from './file';
import { migrate, parseProject, validate } from './migrate';

const project = (): Project => {
  let g = addNode(emptyGraph(), { x: 12.3456, y: -3, th: 0.5 });
  const a = g.id;
  g = addNode(g.graph, { x: 40, y: 7.0004, th: 2 });
  const edges = shareRadius(addEdge(g.graph, a, g.id), 0, []);
  return {
    title: 'Test',
    createdAt: '2026-10-31T06:00:00Z',
    lastUpdatedAt: '2026-10-31T06:01:00Z',
    camera: { x: 1.5, y: -2, scale: 8, rotation: 0.25 },
    graph: { ...edges, edges: edges.edges.map((e) => ({ ...e, radius: 9.1234 })) },
  };
};

describe('the project file (^170)', () => {
  it('stores lengths as integer millimeters, nodes and edges as tuples', () => {
    const f = toFile(project());
    expect(f.version).toBe(FILE_VERSION);
    expect(f.nodes).toEqual([
      [0, 12346, -3000, 0.5],
      [1, 40000, 7000, 2],
    ]);
    expect(f.edges).toEqual([[0, 0, 1, 9123, 1]]);
    expect(f.laneConfigurations).toEqual({ '1': { name: 'default', width: 3000 } });
    expect(f.camera).toEqual({ x: 1500, y: -2000, scale: 8, rotation: 0.25 });
  });

  it('is the same after being saved and loaded again', () => {
    const f = toFile(project());
    const again = toFile(fromFile(JSON.parse(JSON.stringify(f))));
    expect(again).toEqual(f);
    expect(fromFile(f).graph.nodes[0]).toMatchObject({ x: 12.346, y: -3 });
  });

  it('keeps an automatic radius automatic', () => {
    const p = project();
    const graph = { ...p.graph, edges: p.graph.edges.map((e) => ({ ...e, radius: null })) };
    expect(toFile({ ...p, graph }).edges[0]![3]).toBeNull();
    expect(fromFile(toFile({ ...p, graph })).graph.edges[0]!.radius).toBeNull();
  });
});

/** A parsed project file that a test may break. */
type Draft = { nodes: unknown[][]; edges: unknown[]; [key: string]: unknown };

/** The text of an exported project, changed by `change`. */
const text = (change: (f: Draft) => void = () => {}) => {
  const f = JSON.parse(JSON.stringify(toFile(project())));
  change(f);
  return JSON.stringify(f);
};

describe('opening a file (^164)', () => {
  it('accepts what was exported', () => {
    expect(parseProject(text()).title).toBe('Test');
  });

  it.each([
    ['{', /not valid JSON/],
    ['[1]', /not a project/],
  ])('refuses the text %s', (raw, message) => {
    expect(() => parseProject(raw)).toThrow(message);
  });

  it.each<[string, (f: Draft) => void, RegExp]>([
    ['no version', (f) => delete f.version, /no valid version/],
    ['a fractional version', (f) => (f.version = 1.5), /no valid version/],
    ['a newer version', (f) => (f.version = 99), /newer version/],
    ['a broken node', (f) => (f.nodes[0] = [1, 2]), /node is not/],
    ['a broken edge', (f) => (f.edges[0] = [0, 0, 1]), /edge is not/],
    ['a missing node', (f) => (f.edges[0] = [0, 0, 7, null, 1]), /does not exist/],
    ['a missing lane', (f) => (f.edges[0] = [0, 0, 1, null, 4]), /lane configuration/],
    ['a double id', (f) => (f.nodes[1]![0] = 0), /same id/],
    ['a broken camera', (f) => (f.camera = { x: 'a' }), /camera/],
  ])('refuses %s with a clear message', (_, change, message) => {
    expect(() => parseProject(text(change))).toThrow(ProjectFileError);
    expect(() => parseProject(text(change))).toThrow(message);
  });
});

describe('migrations (^173)', () => {
  it('runs the migrations in order up to the current version', () => {
    const migrations = {
      1: (f: Record<string, unknown>) => ({ ...f, a: 1 }),
      2: (f: Record<string, unknown>) => ({ ...f, b: (f.a as number) + 1 }),
    };
    expect(migrate({ version: 1 }, 3, migrations)).toEqual({ version: 3, a: 1, b: 2 });
    expect(migrate({ version: 2 }, 3, migrations)).toEqual({ version: 3, b: NaN });
    expect(() => migrate({ version: 1 }, 3, { 1: migrations[1] })).toThrow(
      /no migration from project version 2/,
    );
  });

  it('brings every sample file of every version to the current version', () => {
    const samples = import.meta.glob('./samples/*.json', { eager: true, import: 'default' });
    expect(Object.keys(samples).length).toBeGreaterThanOrEqual(FILE_VERSION);
    for (const sample of Object.values(samples)) {
      const f = validate(migrate(sample));
      expect(f.version).toBe(FILE_VERSION);
      expect(fromFile(f).graph.nodes.length).toBeGreaterThan(0);
    }
  });
});

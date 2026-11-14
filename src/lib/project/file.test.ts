import { describe, expect, it } from 'vitest';
import v1Sample from './samples/v1.json';
import { addEdge, addNode, emptyGraph, shareRadius } from '../model/graph';
import {
  fromFile,
  toFile,
  FILE_VERSION,
  ProjectFileError,
  type Project,
  type RefusalKind,
} from './file';
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

/** Every way a file is refused (^192 to ^207): the hat, what the user is told, how to break a file so. */
const REFUSALS: [string, RefusalKind, RegExp, (f: Draft) => void][] = [
  ['^194', 'not-project', /not a modelcity project file/, (f) => delete f.version],
  ['^194', 'not-project', /not a modelcity project file/, (f) => (f.version = 1.5)],
  ['^195', 'newer', /newer version.*version 99.*up to 2/, (f) => (f.version = 99)],
  ['^197', 'damaged', /damaged.*console/, (f) => delete f.title],
  ['^198', 'damaged', /damaged.*console/, (f) => (f.camera = { x: 'a' })],
  ['^199', 'damaged', /damaged.*console/, (f) => (f.nodes = {} as never)],
  ['^200', 'damaged', /damaged.*console/, (f) => delete f.laneConfigurations],
  ['^201', 'damaged', /damaged.*console/, (f) => (f.nodes[0] = [1, 2])],
  ['^202', 'damaged', /damaged.*console/, (f) => (f.edges[0] = [0, 0, 1])],
  ['^203', 'damaged', /damaged.*console/, (f) => (f.laneConfigurations = { '1': { name: 5 } })],
  ['^204', 'damaged', /damaged.*console/, (f) => (f.nodes[1]![0] = 0)],
  ['^205', 'damaged', /damaged.*console/, (f) => f.edges.push([...(f.edges[0] as number[])])],
  ['^206', 'damaged', /damaged.*console/, (f) => (f.edges[0] = [0, 0, 7, null, 1])],
  ['^207', 'damaged', /damaged.*console/, (f) => (f.edges[0] = [0, 0, 1, null, 4])],
];

const refusal = (open: () => unknown): ProjectFileError => {
  try {
    open();
  } catch (e) {
    return e as ProjectFileError;
  }
  throw new Error('the file was not refused');
};

describe('opening a file (^164)', () => {
  it('accepts what was exported', () => {
    expect(parseProject(text()).title).toBe('Test');
  });

  it.each([
    ['^192', '{', /not a modelcity project file/],
    ['^193', '[1]', /not a modelcity project file/],
  ])('refuses the text with %s: %s', (hat, raw, message) => {
    const e = refusal(() => parseProject(raw));
    expect(e.hat).toBe(hat);
    expect(e.kind).toBe('not-project');
    expect(e.message).toMatch(message);
  });

  it.each(REFUSALS)(
    'refuses with %s as %s, tells the user in a word and the console where',
    (hat, kind, message, change) => {
      const e = refusal(() => parseProject(text(change)));
      expect([e.hat, e.kind]).toEqual([hat, kind]);
      expect(e.message).toMatch(message);
      expect(e.detail.length).toBeGreaterThan(10);
    },
  );

  it('says where in the file it went wrong', () => {
    const broken = text((f) => (f.nodes[1] = [1, 2]));
    const e = refusal(() => parseProject(broken));
    expect(e.detail).toContain('nodes[1]');
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
    const gap = refusal(() => migrate({ version: 1 }, 3, { 1: migrations[1] }));
    expect([gap.hat, gap.kind]).toEqual(['^196', 'old']);
    expect(gap.message).toMatch(/old version of modelcity \(version 2\)/);
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

describe('the counters of the next ids (^1224)', () => {
  const v1 = () => structuredClone(v1Sample) as { nodes: number[][]; edges: number[][] };

  it('a version 1 project gets the ids its ids implied, also with gaps', () => {
    const f = v1();
    f.nodes[2]![0] = 7;
    f.edges[1]![2] = 7;
    const m = validate(migrate(f));
    expect([m.version, m.nextNodeId, m.nextEdgeId]).toEqual([2, 8, 2]);
  });

  it('refuses a counter that is not above every id (^1225)', () => {
    const f = { ...validate(migrate(v1())), nextNodeId: 2 };
    expect(refusal(() => validate(f)).hat).toBe('^1225');
  });
});

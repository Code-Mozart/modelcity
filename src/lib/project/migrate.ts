import { FILE_VERSION, ProjectFileError, type ProjectFile, type RefusalKind } from './file';
import type { Header } from './storage';

/** Migration `n` turns a project of version `n` into version `n + 1`: a pure function on parsed JSON (^173). */
export type Migrations = Record<number, (file: Record<string, unknown>) => Record<string, unknown>>;

const nextAfter = (rows: unknown): number =>
  Array.isArray(rows)
    ? rows.reduce(
        (m: number, r) => (Array.isArray(r) && isNum(r[0]) ? Math.max(m, r[0] + 1) : m),
        0,
      )
    : 0;

/**
 * The migrations of the stored model; old ones are never edited. 1 to 2 (^1224): the ids the next
 * node and edge get are stored; a version 1 project gets the ones its ids implied (the largest + 1).
 */
const MIGRATIONS: Migrations = {
  1: (f) => ({ ...f, nextNodeId: nextAfter(f.nodes), nextEdgeId: nextAfter(f.edges) }),
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Every way a file is refused has a hat (^192 to ^208) that says what the user is told and what the
 * console gets. When the import changes (the data model is extended or changed, a migration or a
 * check is added), the hats are made or updated in the same step (^209).
 */
function refuse(kind: RefusalKind, hat: string, detail: string, v = {}): never {
  throw new ProjectFileError(kind, hat, detail, v);
}

/** Refuse a damaged project if `ok` is false. */
function check(ok: boolean, hat: string, detail: string): asserts ok {
  if (!ok) refuse('damaged', hat, detail);
}

/** The project in the current version, or the reason it cannot be opened (^173). */
export function migrate(
  json: unknown,
  current = FILE_VERSION,
  migrations: Migrations = MIGRATIONS,
): Record<string, unknown> {
  if (!isRecord(json)) refuse('not-project', '^193', 'the file is JSON but not an object');
  let file = json;
  const version = file.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    refuse(
      'not-project',
      '^194',
      `"version" is ${JSON.stringify(version)}, not a whole number of at least 1`,
    );
  }
  if (version > current) {
    const detail = `the project has version ${version}, this version reads up to ${current}`;
    refuse('newer', '^195', detail, { version, current });
  }
  for (let v = version; v < current; v++) {
    const step = migrations[v];
    if (!step)
      refuse('old', '^196', `there is no migration from version ${v} to ${v + 1}`, { version: v });
    file = { ...step(file), version: v + 1 };
  }
  return file;
}

function checkTuples(f: Record<string, unknown>) {
  const nodes = f.nodes as unknown[];
  nodes.forEach((n, i) => {
    const ok = Array.isArray(n) && n.length === 4 && n.every(isNum);
    check(ok, '^201', `nodes[${i}] is ${JSON.stringify(n)}, not [id, x, y, heading] of numbers`);
  });
  const edges = f.edges as unknown[];
  edges.forEach((e, i) => {
    const t = e as unknown[];
    const ok = Array.isArray(t) && t.length === 5 && [0, 1, 2, 4].every((k) => isNum(t[k]));
    check(
      ok && (t[3] === null || isNum(t[3])),
      '^202',
      `edges[${i}] is ${JSON.stringify(e)}, not [id, start, end, radius or null, lane] of numbers`,
    );
  });
  for (const [id, l] of Object.entries(f.laneConfigurations as Record<string, unknown>)) {
    const ok = isRecord(l) && typeof l.name === 'string' && isNum(l.width);
    check(ok, '^203', `laneConfigurations["${id}"] has no name (text) and width (number)`);
  }
}

function checkCounters(f: Record<string, unknown>) {
  const [nodes, edges] = [nextAfter(f.nodes), nextAfter(f.edges)];
  const ok = (v: unknown, least: number) => isNum(v) && Number.isInteger(v) && v >= least;
  check(
    ok(f.nextNodeId, nodes),
    '^1225',
    `"nextNodeId" is ${JSON.stringify(f.nextNodeId)}, not a whole number above every node id (at least ${nodes})`,
  );
  check(
    ok(f.nextEdgeId, edges),
    '^1225',
    `"nextEdgeId" is ${JSON.stringify(f.nextEdgeId)}, not a whole number above every edge id (at least ${edges})`,
  );
}

function checkReferences(f: ProjectFile) {
  const nodeIds = new Set(f.nodes.map((n) => n[0]));
  check(nodeIds.size === f.nodes.length, '^204', 'two nodes have the same id');
  check(
    new Set(f.edges.map((e) => e[0])).size === f.edges.length,
    '^205',
    'two edges have the same id',
  );
  f.edges.forEach(([id, start, end, , lane]) => {
    check(
      nodeIds.has(start) && nodeIds.has(end),
      '^206',
      `edge ${id} runs from node ${start} to node ${end}, and one of them does not exist`,
    );
    check(
      f.laneConfigurations[lane] !== undefined,
      '^207',
      `edge ${id} uses lane configuration ${lane}, which does not exist`,
    );
  });
}

/** Check the header of a project of the current version: what is checked without reading the map. */
export function validateHeader(f: Record<string, unknown>): Header {
  const texts = ['title', 'createdAt', 'lastUpdatedAt'].every((k) => typeof f[k] === 'string');
  check(texts, '^197', '"title", "createdAt" and "lastUpdatedAt" must be text');
  const c = f.camera;
  const camera = isRecord(c) && ['x', 'y', 'scale', 'rotation'].every((k) => isNum(c[k]));
  check(camera, '^198', '"camera" must have the numbers x, y, scale and rotation');
  check(isRecord(f.laneConfigurations), '^200', '"laneConfigurations" must be an object');
  const whole = (v: unknown) => isNum(v) && Number.isInteger(v) && v >= 0;
  check(
    whole(f.nextNodeId) && whole(f.nextEdgeId),
    '^1225',
    '"nextNodeId" and "nextEdgeId" must be whole numbers',
  );
  return f as unknown as Header;
}

/** Check that a whole project of the current version has the shape of the stored model (`docs/data-model.md`). */
export function validate(f: Record<string, unknown>): ProjectFile {
  validateHeader(f);
  check(
    Array.isArray(f.nodes) && Array.isArray(f.edges),
    '^199',
    '"nodes" and "edges" must be lists',
  );
  checkTuples(f);
  checkCounters(f);
  checkReferences(f as unknown as ProjectFile);
  return f as unknown as ProjectFile;
}

/**
 * A project of any source (an import, the browser storage, later Supabase) in the current version
 * and checked: the one pipeline (^229). A project of an older version is migrated by the same
 * converters; with no converter for its version it is refused (^196).
 */
export const readProject = (json: unknown): ProjectFile => validate(migrate(json));

/** Parse the text of a project file: migrated to the current version and checked. */
export function parseProject(text: string): ProjectFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    refuse(
      'not-project',
      '^192',
      `the file is not valid JSON (${e instanceof Error ? e.message : e})`,
    );
  }
  return readProject(json);
}

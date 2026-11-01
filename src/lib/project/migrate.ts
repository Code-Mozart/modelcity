import { FILE_VERSION, ProjectFileError, type ProjectFile } from './file';

/** Migration `n` turns a project of version `n` into version `n + 1`: a pure function on parsed JSON (^173). */
export type Migrations = Record<number, (file: Record<string, unknown>) => Record<string, unknown>>;

/** The migrations of the stored model. None yet: version 1 is the first. Old ones are never edited. */
export const MIGRATIONS: Migrations = {};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const tuple = (v: unknown, size: number) => Array.isArray(v) && v.length === size;

function check(ok: boolean, message: string): asserts ok {
  if (!ok) throw new ProjectFileError(message);
}

/** The project in the current version, or an error saying what is wrong with it (^173). */
export function migrate(
  json: unknown,
  current = FILE_VERSION,
  migrations: Migrations = MIGRATIONS,
): Record<string, unknown> {
  check(isRecord(json), 'This is not a project file.');
  let file: Record<string, unknown> = json;
  const version = file.version;
  check(
    typeof version === 'number' && Number.isInteger(version) && version >= 1,
    'The project has no valid version.',
  );
  check(
    version <= current,
    `This project was made by a newer version of modelcity (project version ${version}, this one understands up to ${current}).`,
  );
  for (let v = version; v < current; v++) {
    const step = migrations[v];
    check(!!step, `There is no migration from project version ${v}.`);
    file = { ...step(file), version: v + 1 };
  }
  return file;
}

function checkLists(f: Record<string, unknown>) {
  check(Array.isArray(f.nodes) && Array.isArray(f.edges), 'The project has no nodes or edges.');
  check(isRecord(f.laneConfigurations), 'The project has no lane configurations.');
  for (const n of f.nodes as unknown[])
    check(tuple(n, 4) && (n as unknown[]).every(isNum), 'A node is not [id, x, y, heading].');
  for (const e of f.edges as unknown[]) {
    const ok = tuple(e, 5) && [0, 1, 2, 4].every((i) => isNum((e as unknown[])[i]));
    check(
      ok && ((e as unknown[])[3] === null || isNum((e as unknown[])[3])),
      'An edge is not [id, start, end, radius, lane].',
    );
  }
}

function checkReferences(f: ProjectFile) {
  const nodeIds = new Set(f.nodes.map((n) => n[0]));
  check(nodeIds.size === f.nodes.length, 'Two nodes have the same id.');
  check(new Set(f.edges.map((e) => e[0])).size === f.edges.length, 'Two edges have the same id.');
  for (const [, start, end, , lane] of f.edges) {
    check(nodeIds.has(start) && nodeIds.has(end), 'An edge refers to a node that does not exist.');
    check(
      f.laneConfigurations[lane] !== undefined,
      'An edge refers to a lane configuration that does not exist.',
    );
  }
}

/** Check that a project of the current version has the shape of the stored model (`docs/data-model.md`). */
export function validate(f: Record<string, unknown>): ProjectFile {
  check(
    typeof f.title === 'string' &&
      typeof f.createdAt === 'string' &&
      typeof f.lastUpdatedAt === 'string',
    'The project has no title or dates.',
  );
  const c = f.camera;
  check(
    isRecord(c) && ['x', 'y', 'scale', 'rotation'].every((k) => isNum(c[k])),
    'The camera of the project is not valid.',
  );
  checkLists(f);
  const lanes = f.laneConfigurations as Record<string, unknown>;
  for (const l of Object.values(lanes))
    check(
      isRecord(l) && typeof l.name === 'string' && isNum(l.width),
      'A lane configuration has no name or width.',
    );
  checkReferences(f as unknown as ProjectFile);
  return f as unknown as ProjectFile;
}

/** Parse the text of a project file: migrated to the current version and checked. */
export function parseProject(text: string): ProjectFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ProjectFileError('This is not a project file (it is not valid JSON).');
  }
  return validate(migrate(json));
}

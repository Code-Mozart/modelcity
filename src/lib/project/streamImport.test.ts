import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { file } from '../testing/storageFixtures';
import { ProjectFileError } from './file';
import { IndexedDbStorage } from './indexedDb';
import { parseProject } from './migrate';
import { MemoryStorage, type ProjectStorage } from './storage';
import { importStream } from './streamImport';
import { piecesOfText } from './textPieces';

globalThis.IDBKeyRange = IDBKeyRange;

async function* small(text: string, size: number) {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}

const stored = async (s: ProjectStorage, id: string) => s.load(id) as Promise<{ nodes: unknown[] }>;

const refusal = async (text: string) => {
  const storage = new MemoryStorage();
  const err = await importStream(storage, 'x', small(text, 7)).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ProjectFileError);
  expect(await storage.list()).toEqual([]);
  return (err as ProjectFileError).hat;
};

const f = () => JSON.parse(JSON.stringify(file())) as Record<string, unknown>;

/** Imports a file in pieces into a storage and compares it with what the reader of the whole file finds. */
async function sameAsWhole(Storage: new () => ProjectStorage) {
  globalThis.indexedDB = new IDBFactory();
  const text = JSON.stringify(file(), null, 2);
  const whole = parseProject(text);
  const rows = (r: unknown[]) => new Set(r.map((n) => JSON.stringify(n)));
  for (const size of [3, 64, 1 << 20]) {
    const storage = new Storage();
    const header = await importStream(storage, `p${size}`, small(text, size));
    expect(header.title).toBe(whole.title);
    expect(header.nextNodeId).toBe(whole.nextNodeId);
    const back = (await storage.load(`p${size}`)) as { nodes: unknown[]; edges: unknown[] };
    expect(rows(back.nodes)).toEqual(rows(whole.nodes));
    expect(back.edges).toHaveLength(whole.edges.length);
  }
}

describe('the import of a file in pieces (^1256)', () => {
  it.each([MemoryStorage, IndexedDbStorage])(
    'stores what the whole-file reader finds, in any piece size (%o)',
    sameAsWhole,
  );

  it('migrates a version 1 file: the counters come from the ids', async () => {
    const v1: Record<string, unknown> = { ...f(), version: 1 };
    delete v1.nextNodeId;
    delete v1.nextEdgeId;
    const storage = new MemoryStorage();
    const header = await importStream(storage, 'a', piecesOfText(JSON.stringify(v1)));
    const whole = parseProject(JSON.stringify(v1));
    expect([header.nextNodeId, header.nextEdgeId]).toEqual([whole.nextNodeId, whole.nextEdgeId]);
    expect(header.version).toBe(2);
  });

  it('accepts the keys in any order, and a project without nodes', async () => {
    const reordered = JSON.stringify(Object.fromEntries(Object.entries(f()).reverse()));
    const storage = new MemoryStorage();
    await importStream(storage, 'a', small(reordered, 5));
    expect((await stored(storage, 'a')).nodes.length).toBeGreaterThan(0);
    await importStream(
      storage,
      'b',
      piecesOfText(JSON.stringify({ ...f(), nodes: [], edges: [] })),
    );
    expect((await stored(storage, 'b')).nodes).toEqual([]);
  });
});

const REFUSALS: [string, (x: Record<string, unknown>) => unknown, string][] = [
  ['text that is not JSON', () => '{"a":', '^192'],
  ['a project of a newer version', (x) => ({ ...x, version: 99 }), '^195'],
  ['no list of nodes', (x) => ({ ...x, nodes: undefined }), '^199'],
  ['a node that is no row', (x) => ({ ...x, nodes: [[1, 2]] }), '^201'],
  [
    'two nodes with one id',
    (x) => ({
      ...x,
      nodes: [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
      ],
    }),
    '^204',
  ],
  ['an edge to a node that is not there', (x) => ({ ...x, edges: [[0, 0, 999, null, 1]] }), '^206'],
  [
    'an edge with a missing lane configuration',
    (x) => ({ ...x, edges: [[0, 0, 1, null, 77]] }),
    '^207',
  ],
  ['a counter that is too small', (x) => ({ ...x, nextNodeId: 0 }), '^1225'],
];

describe('the refusals of the import in pieces (^1256)', () => {
  it.each(REFUSALS)('refuses %s with its hat, and lists nothing', async (_, change, hat) => {
    const bad = change(f());
    expect(await refusal(typeof bad === 'string' ? bad : JSON.stringify(bad))).toBe(hat);
  });

  it('refuses two edges with one id', async () => {
    const e = [
      [0, 0, 1, null, 1],
      [0, 1, 0, null, 1],
    ];
    expect(await refusal(JSON.stringify({ ...f(), edges: e }))).toBe('^205');
  });

  it('refuses a file of a newer version before it reads the map', async () => {
    const storage = new MemoryStorage();
    const text = `{"version": 99, "nodes": [[0,0,0,0]],\n"title": "x"}`;
    const wrote: unknown[] = [];
    const spy = Object.create(storage) as ProjectStorage;
    spy.append = async (...a) => void wrote.push(a);
    await expect(importStream(spy, 'x', small(text, 4))).rejects.toThrow(ProjectFileError);
    expect(wrote).toEqual([]);
  });
});

describe('the import in the session (^1256)', () => {
  it('removes the rows of a file that is refused after its map was written', async () => {
    const { setup } = await import('../testing/sessionHelpers');
    const { session, storage } = setup();
    const bad = JSON.stringify({ ...f(), edges: [[0, 0, 999, null, 1]] });
    await session.importText(bad);
    expect(session.error).not.toBeNull();
    expect(await storage.list()).toEqual([]);
    expect(await storage.nodesByIds(session.id ?? 'none', [0])).toEqual([]);
    expect(session.importing).toBeNull();
  });
});

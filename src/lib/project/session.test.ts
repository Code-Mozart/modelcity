import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Camera } from '../camera.svelte';
import { Editor } from '../editor.svelte';
import { click, draw } from '../testing/editorHelpers';
import { fromFile } from './file';
import { addNode } from '../model/graph';
import { AUTOSAVE_MAX_WAIT_MS, AUTOSAVE_MS, ProjectSession } from './session.svelte';
import { MemoryStorage } from './storage';

let tick = 0;
const setup = () => {
  const editor = new Editor();
  const camera = new Camera();
  camera.size = { width: 1000, height: 800 };
  const storage = new MemoryStorage();
  const clock = () => `2026-11-01T00:00:${String(tick++).padStart(2, '0')}Z`;
  return { editor, camera, storage, session: new ProjectSession(editor, camera, storage, clock) };
};

/** Draw a road of two nodes into the editor of the session. */
const drawRoad = (editor: Editor, camera?: Camera) => {
  click(editor, 500, 500);
  click(editor, 0, 0);
  click(editor, 30, 10);
  editor.key('Escape');
  camera?.setAnchors(editor.anchors);
};

beforeEach(() => {
  tick = 0;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('the open project (^82, ^148)', () => {
  it('starts with a new project in an empty browser, and keeps it', async () => {
    const { session, storage } = setup();
    await session.start();
    expect(session.id).not.toBe('');
    expect(await storage.list()).toHaveLength(1);
    expect(session.projects).toHaveLength(1);
  });

  it('saves a short while after the map changed, once, not after the camera moved (^166)', async () => {
    const { session, editor, camera, storage } = setup();
    await session.start();
    const before = (await storage.list())[0]!.file.lastUpdatedAt;
    camera.restore({ x: 0, y: 0, scale: 9, rotation: 0 });
    session.changed();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS * 2);
    expect((await storage.list())[0]!.file.lastUpdatedAt).toBe(before);
    drawRoad(editor, camera);
    camera.restore({ x: 5, y: 5, scale: 9, rotation: 0 });
    session.changed();
    session.changed();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS - 1);
    expect((await storage.list())[0]!.file.nodes).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(2);
    const [stored] = await storage.list();
    expect(stored!.file.nodes).toHaveLength(2);
    expect(stored!.file.lastUpdatedAt).not.toBe(before);
    expect(stored!.file.camera).toMatchObject({ x: 5000, y: 5000, scale: 9 });
  });
});

describe('several projects (^167, ^171)', () => {
  it('a new project saves the open one first and starts blank (^171)', async () => {
    const { session, editor, storage } = setup();
    await session.start();
    drawRoad(editor);
    const first = session.id;
    await session.create();
    expect(session.id).not.toBe(first);
    expect(editor.graph.nodes).toHaveLength(0);
    const all = await storage.list();
    expect(all).toHaveLength(2);
    expect(all.find((p) => p.id === first)!.file.nodes).toHaveLength(2);
  });

  it('opens another project with its map and camera, and the history starts again (^167)', async () => {
    const { session, editor, camera } = setup();
    await session.start();
    drawRoad(editor, camera);
    camera.restore({ x: 3, y: 4, scale: 6, rotation: 0.5 });
    const first = session.id;
    await session.create();
    expect(editor.canUndo).toBe(false);
    await session.open(first);
    expect(editor.graph.nodes).toHaveLength(2);
    expect(camera.state).toMatchObject({ x: 3, y: 4, scale: 6, rotation: 0.5 });
    expect(editor.canUndo).toBe(false);
  });

  it('deleting the open project opens another, or a new one', async () => {
    const { session, storage } = setup();
    await session.start();
    const first = session.id;
    await session.create();
    await session.remove(session.id);
    expect(session.id).toBe(first);
    await session.remove(first);
    expect(session.id).not.toBe(first);
    expect(await storage.list()).toHaveLength(1);
  });
});

describe('import and export (^163, ^164)', () => {
  it('exports the project as a file that imports as a new project', async () => {
    const { session, editor, storage } = setup();
    await session.start();
    drawRoad(editor);
    const text = session.exportText();
    expect(JSON.parse(text)).toMatchObject({ version: 1, title: 'Untitled project' });
    const first = session.id;
    await session.importText(text);
    expect(session.id).not.toBe(first);
    expect(editor.graph.nodes).toHaveLength(2);
    expect(session.error).toBeNull();
    expect(await storage.list()).toHaveLength(2);
    expect(fromFile(JSON.parse(text)).graph.edges).toHaveLength(1);
  });

  it('keeps the open project and says what is wrong with a file that is no project', async () => {
    const { session, editor } = setup();
    await session.start();
    drawRoad(editor);
    const id = session.id;
    await session.importText('{"version": 7}');
    expect(session.error).toMatch(/newer version/);
    expect(session.id).toBe(id);
    expect(editor.graph.nodes).toHaveLength(2);
  });
});

describe('the editor and the project', () => {
  it('rounds what a step produced to the millimeter (^170)', () => {
    const ed = draw([[10.0004, 20.0006]]);
    expect(ed.graph.nodes[0]).toMatchObject({ x: 10, y: 20.001 });
  });
});

describe('the projects dialog (^168, ^178)', () => {
  it('renames at once, for the open project too, and the date of the last change stays', async () => {
    const { session, storage } = setup();
    await session.start();
    const first = session.id;
    await session.create();
    const dates = Object.fromEntries(
      (await storage.list()).map((p) => [p.id, p.file.lastUpdatedAt]),
    );
    await session.openDialog();
    await session.rename(first, '  Harbour  ');
    await session.rename(session.id, 'Old town');
    const stored = await storage.list();
    expect(stored.find((p) => p.id === first)!.file).toMatchObject({
      title: 'Harbour',
      lastUpdatedAt: dates[first],
    });
    expect(stored.find((p) => p.id === session.id)!.file).toMatchObject({
      title: 'Old town',
      lastUpdatedAt: dates[session.id],
    });
    expect(session.title).toBe('Old town');
    expect(session.busy).toBe(false);
    expect(session.shown.map((p) => p.file.title).sort()).toEqual(['Harbour', 'Old town']);
  });

  it('refuses an empty name and cancels the row', async () => {
    const { session } = setup();
    await session.start();
    await session.openDialog();
    session.startRename(session.id);
    await session.rename(session.id, '   ');
    expect(session.title).toBe('Untitled project');
    expect(session.row).toBeNull();
  });
});

describe('deleting and searching projects (^168, ^178)', () => {
  it('asks before it deletes: a delete is a start and a confirmation, cancel leaves the project', async () => {
    const { session, storage } = setup();
    await session.start();
    const first = session.id;
    await session.create();
    await session.openDialog();
    session.startDelete(first);
    expect(session.row).toEqual({ id: first, mode: 'delete' });
    session.cancelRow();
    expect(await storage.list()).toHaveLength(2);
    session.startDelete(first);
    await session.confirmDelete();
    expect(await storage.list()).toHaveLength(1);
    expect(session.row).toBeNull();
  });

  it('searches the projects fuzzily, and a click on the open project closes the dialog', async () => {
    const { session } = setup();
    await session.start();
    const first = session.id;
    await session.rename(first, 'Harbour district');
    await session.create();
    await session.rename(session.id, 'Old town');
    await session.openDialog();
    session.query = 'hbr';
    expect(session.shown.map((p) => p.file.title)).toEqual(['Harbour district']);
    session.query = 'zzz';
    expect(session.shown).toEqual([]);
    session.query = '';
    await session.open(session.id);
    expect(session.dialogOpen).toBe(false);
  });
});

describe('autosave with a maximum wait (^166, ^183)', () => {
  it('saves a long run of changes on the way, at the latest after the maximum wait', async () => {
    const { session, editor, storage } = setup();
    await session.start();
    const change = () => {
      editor.graph = addNode(editor.graph, { x: editor.graph.nodes.length, y: 0, th: 0 }).graph;
      session.changed();
    };
    const nodes = async () => (await storage.list())[0]!.file.nodes.length;
    for (let ms = 0; ms < AUTOSAVE_MAX_WAIT_MS - 300; ms += 300) {
      change();
      await vi.advanceTimersByTimeAsync(300);
    }
    expect(await nodes()).toBe(0);
    change();
    await vi.advanceTimersByTimeAsync(300);
    expect(await nodes()).toBeGreaterThan(10);
    const saved = await nodes();
    change();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS + 1);
    expect(await nodes()).toBe(saved + 1);
  });
});

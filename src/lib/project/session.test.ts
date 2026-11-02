import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addNode } from '../model/graph';
import { click } from '../testing/editorHelpers';
import { drawRoad, resetClock, setup, two, withRoad, datesOf } from '../testing/sessionHelpers';
import { fromFile } from './file';
import { AUTOSAVE_MAX_WAIT_MS, AUTOSAVE_MS } from './session.svelte';

beforeEach(() => {
  resetClock();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('the open project (^82, ^148, ^189)', () => {
  it('starts with no project in an empty browser, and keeps nothing until there is something', async () => {
    const { session, storage } = setup();
    await session.start();
    expect(session.ready).toBe(true);
    expect(session.noProject).toBe(true);
    await session.flush();
    expect(await storage.list()).toHaveLength(0);
  });

  it('the first change makes the project, a short while after it (^166)', async () => {
    const s = setup();
    await s.session.start();
    drawRoad(s.editor);
    s.session.changed();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS - 1);
    expect(await s.storage.list()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(2);
    const [stored] = await s.storage.list();
    expect(stored!.file.nodes).toHaveLength(2);
    expect(stored!.file.title).toBe('Untitled project');
    expect(s.session.noProject).toBe(false);
  });

  it('moving the camera alone saves nothing', async () => {
    const s = setup();
    await withRoad(s);
    const before = (await s.storage.list())[0]!.file.lastUpdatedAt;
    s.camera.restore({ x: 5, y: 5, scale: 9, rotation: 0 });
    s.session.changed();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS * 2);
    expect((await s.storage.list())[0]!.file.lastUpdatedAt).toBe(before);
  });
});

describe('the date and the camera of a project (^189)', () => {
  it('a project that is opened again keeps its date, the date only follows the map', async () => {
    const s = setup();
    await withRoad(s);
    const first = await datesOf(s.storage);
    const id = s.session.id;
    await s.session.newProject();
    await s.session.openModal();
    await s.session.open(id);
    await s.session.openModal();
    await s.session.newProject();
    expect(await datesOf(s.storage)).toEqual(first);
  });

  it('saves the camera with the project, also when only the camera changed before leaving', async () => {
    const s = setup();
    await withRoad(s);
    s.camera.restore({ x: 3, y: 4, scale: 6, rotation: 0.5 });
    await s.session.newProject();
    expect((await s.storage.list())[0]!.file.camera).toMatchObject({ x: 3000, y: 4000, scale: 6 });
  });
});

describe('several projects (^167, ^171, ^189)', () => {
  it('a new project saves the open one and is no project until something is drawn', async () => {
    const s = setup();
    await withRoad(s);
    await s.session.newProject();
    expect(s.session.noProject).toBe(true);
    expect(s.editor.graph.nodes).toHaveLength(0);
    expect(await s.storage.list()).toHaveLength(1);
    drawRoad(s.editor);
    s.session.changed();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS + 1);
    expect(await s.storage.list()).toHaveLength(2);
  });

  it('with no project, new project only closes the modal', async () => {
    const { session, storage } = setup();
    await session.start();
    await session.openModal();
    await session.newProject();
    expect(session.modalOpen).toBe(false);
    expect(await storage.list()).toHaveLength(0);
  });
});

describe('opening and deleting projects (^167, ^189)', () => {
  it('opens another project with its map and camera, and the history starts again', async () => {
    const s = setup();
    await withRoad(s);
    s.camera.restore({ x: 3, y: 4, scale: 6, rotation: 0.5 });
    const first = s.session.id;
    await s.session.newProject();
    expect(s.editor.timeline.canUndo).toBe(false);
    await s.session.open(first);
    expect(s.editor.graph.nodes).toHaveLength(2);
    expect(s.camera.state).toMatchObject({ x: 3, y: 4, scale: 6, rotation: 0.5 });
    expect(s.editor.timeline.canUndo).toBe(false);
  });

  it('deleting the open project opens another, or there is none', async () => {
    const s = setup();
    await withRoad(s);
    const first = s.session.id;
    await s.session.newProject();
    drawRoad(s.editor);
    s.session.changed();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS + 1);
    await s.session.remove(s.session.id);
    expect(s.session.id).toBe(first);
    await s.session.remove(first);
    expect(s.session.noProject).toBe(true);
    expect(await s.storage.list()).toHaveLength(0);
  });
});

describe('import and export (^163, ^164)', () => {
  it('exports the project as a file that imports as a new project', async () => {
    const s = setup();
    await withRoad(s);
    const text = s.session.exportText();
    expect(JSON.parse(text)).toMatchObject({ version: 1, title: 'Untitled project' });
    const first = s.session.id;
    await s.session.importText(text);
    expect(s.session.id).not.toBe(first);
    expect(s.editor.graph.nodes).toHaveLength(2);
    expect(s.session.error).toBeNull();
    expect(await s.storage.list()).toHaveLength(2);
    expect(fromFile(JSON.parse(text)).graph.edges).toHaveLength(1);
  });

  it('exports a map without a project too', async () => {
    const { session } = setup();
    await session.start();
    expect(JSON.parse(session.exportText())).toMatchObject({ version: 1, nodes: [], edges: [] });
  });

  it('keeps the open project and says what is wrong with a file that is no project', async () => {
    const s = setup();
    await withRoad(s);
    const id = s.session.id;
    await s.session.importText('{"version": 7}');
    expect(s.session.error).toMatch(/newer version/);
    expect(s.session.id).toBe(id);
    expect(s.editor.graph.nodes).toHaveLength(2);
  });
});

describe('the editor and the project', () => {
  it('rounds what a step produced to the millimeter (^170)', () => {
    const { editor } = setup();
    click(editor, 500, 500);
    click(editor, 10.0004, 20.0006);
    expect(editor.graph.nodes[0]).toMatchObject({ x: 10, y: 20.001 });
  });
});

describe('the projects modal (^168, ^178)', () => {
  it('renames at once, for the open project too, and the date of the last change stays', async () => {
    const s = setup();
    const first = await two(s);
    const dates = Object.fromEntries(
      (await s.storage.list()).map((p) => [p.id, p.file.lastUpdatedAt]),
    );
    await s.session.openModal();
    await s.session.rename(first, '  Harbour  ');
    await s.session.rename(s.session.id, 'Old town');
    const stored = await s.storage.list();
    expect(stored.find((p) => p.id === first)!.file).toMatchObject({
      title: 'Harbour',
      lastUpdatedAt: dates[first],
    });
    expect(stored.find((p) => p.id === s.session.id)!.file).toMatchObject({
      title: 'Old town',
      lastUpdatedAt: dates[s.session.id],
    });
    expect(s.session.busy).toBe(false);
    expect(s.session.projects.map((p) => p.file.title).sort()).toEqual(['Harbour', 'Old town']);
  });
});

describe('renaming, deleting and importing in the modal (^168)', () => {
  it('refuses an empty name and cancels the row', async () => {
    const s = setup();
    await withRoad(s);
    await s.session.openModal();
    s.session.startRename(s.session.id);
    await s.session.rename(s.session.id, '   ');
    expect(s.session.title).toBe('Untitled project');
    expect(s.session.row).toBeNull();
  });

  it('asks before it deletes, and cancel leaves the project', async () => {
    const s = setup();
    const first = await two(s);
    await s.session.openModal();
    s.session.startDelete(first);
    expect(s.session.row).toEqual({ id: first, mode: 'delete' });
    s.session.cancelRow();
    expect(await s.storage.list()).toHaveLength(2);
    s.session.startDelete(first);
    await s.session.confirmDelete();
    expect(await s.storage.list()).toHaveLength(1);
    expect(s.session.row).toBeNull();
  });

  it('a click on the open project closes the modal', async () => {
    const s = setup();
    await two(s);
    await s.session.openModal();
    await s.session.open(s.session.id);
    expect(s.session.modalOpen).toBe(false);
  });
});

describe('opening a file keeps its dates (^214)', () => {
  it('keeps the dates of the file: opening a file is not a change of the map (^214)', async () => {
    const { session, storage } = setup();
    await session.start();
    const file = JSON.parse(session.exportText());
    file.createdAt = '2026-10-01T19:02:41.454Z';
    file.lastUpdatedAt = '2026-10-12T19:06:18.603Z';
    await session.importText(JSON.stringify(file));
    const [stored] = await storage.list();
    expect(stored!.file).toMatchObject({
      createdAt: file.createdAt,
      lastUpdatedAt: file.lastUpdatedAt,
    });
    expect(session.exportText()).toContain(file.lastUpdatedAt);
  });
});

describe('refusing a file (^208, ^209)', () => {
  it('refuses a file that cannot be read, like one that is no project (^208)', async () => {
    const s = setup();
    await s.session.start();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await s.session.importFile({ text: () => Promise.reject(new Error('gone')) });
    expect(s.session.error).toMatch(/could not be read/);
    expect(log.mock.calls[0]![0]).toContain('^208');
    await s.session.importText('{"version": 7}');
    expect(s.session.error).toMatch(/newer version/);
    expect(log.mock.calls[1]![0]).toContain('^195');
    log.mockRestore();
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
    const nodes = async () => (await storage.list())[0]?.file.nodes.length ?? 0;
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

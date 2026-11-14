import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drawRoad, resetClock, setup, withRoad } from '../testing/sessionHelpers';
import { toFile, titleOf, versionLabel, REFUSAL_TEXT } from './file';
import { emptyGraph } from '../model/graph';
import type { ToastKind } from '../ui/toasts.svelte';

const told: [ToastKind, string][] = [];
const tellMe = (kind: ToastKind, text: string) => told.push([kind, text]);

/** A stored project (the id and the file as it is kept in the browser) with a change to the file. */
const stored = (change: Record<string, unknown> = {}, id = 'broken') => ({
  id,
  file: {
    ...toFile({
      title: 'Old',
      createdAt: '2026-11-01T00:00:00Z',
      lastUpdatedAt: '2026-11-01T00:00:05Z',
      camera: { x: 0, y: 0, scale: 4, rotation: 0 },
      graph: emptyGraph(),
    }),
    ...change,
  },
});

beforeEach(() => {
  told.length = 0;
  resetClock();
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('projects from the browser storage go through the same checks as an import (^229)', () => {
  it('the project that was open last cannot be read: a toast with the text of the refusal, an empty project, the stored one kept', async () => {
    const { session, storage } = setup(tellMe);
    await storage.put(stored({ version: 99 }));
    await session.start();
    expect(told).toEqual([['error', REFUSAL_TEXT.newer({ version: 99, current: 2 })]]);
    expect(session.noProject).toBe(true);
    expect(session.ready).toBe(true);
    expect((await storage.list()).map((p) => p.id)).toEqual(['broken']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('load refused (^195)'));
  });

  it('a damaged file is told like a damaged import', async () => {
    const { session, storage } = setup(tellMe);
    await storage.put(stored({ nodes: 'no list' }));
    await session.start();
    expect(told[0]![1]).toBe(REFUSAL_TEXT.damaged({}));
  });

  it('opening a card that cannot be read tells it and stays in the project that is open', async () => {
    const s = setup(tellMe);
    await withRoad(s);
    const open = s.session.id;
    await s.storage.put(stored({ edges: 7 }));
    await s.session.openModal();
    await s.session.open('broken');
    expect(told).toHaveLength(1);
    expect(s.session.id).toBe(open);
    expect(s.session.modalOpen).toBe(true);
  });
});

describe('what the cards say (^229)', () => {
  it('a good project opens as before and nothing is told', async () => {
    const { session, storage } = setup(tellMe);
    await storage.put(stored({}, 'fine'));
    await session.start();
    expect(session.id).toBe('fine');
    expect(told).toEqual([]);
  });

  it('a card of a project with a broken file has a title and an old version a label', () => {
    expect(titleOf({ title: undefined })).toBe('(damaged project)');
    expect(titleOf({ title: '  ' })).toBe('(damaged project)');
    expect(titleOf({ title: 'Mine' })).toBe('Mine');
    expect(versionLabel({ version: 1 }, 2)).toBe('version 1');
    expect(versionLabel({ version: 2 }, 2)).toBe('');
    expect(versionLabel({}, 2)).toBe('');
  });
});

describe('what the user asked for is confirmed (^185, ^226, ^232)', () => {
  it('Ctrl+S saves at once and says so; with nothing to save it says that', async () => {
    const s = setup(tellMe);
    await s.session.start();
    await s.session.saveNow();
    expect(told).toEqual([
      ['info', 'nothing to save yet'],
      ['info', 'modelcity saves automatically'],
    ]);
    told.length = 0;
    drawRoad(s.editor, s.camera);
    await s.session.saveNow();
    expect(told).toEqual([
      ['success', 'saved'],
      ['info', 'modelcity saves automatically'],
    ]);
    expect(await s.storage.list()).toHaveLength(1);
  });

  it('Ctrl+O opens the modal with the file window, the plain way does not', async () => {
    const { session } = setup(tellMe);
    await session.start();
    await session.openModal(true);
    expect(session.wantsImport).toBe(true);
    await session.openModal();
    expect(session.wantsImport).toBe(false);
  });
});

describe('the rename in the modal is not thrown away by accident (^233)', () => {
  it('while the name was changed the modal does not close, nothing else opens; unchanged it may', async () => {
    const s = setup(tellMe);
    await withRoad(s);
    await s.session.openModal();
    const id = s.session.id;
    s.session.startRename(id);
    s.session.requestClose();
    expect(s.session.modalOpen).toBe(false);
    await s.session.openModal();
    s.session.startRename(id);
    s.session.renameDirty = true;
    told.length = 0;
    s.session.requestClose();
    expect(s.session.modalOpen).toBe(true);
    expect(told).toEqual([['warning', 'Finish or cancel the rename first.']]);
    await s.session.newProject();
    expect(s.session.id).toBe(id);
    s.session.cancelRow();
    s.session.requestClose();
    expect(s.session.modalOpen).toBe(false);
  });
});

describe('a stored project of an older data model (^1226)', () => {
  it('is converted when it opens: a toast says so and it is saved in the new version, the date unchanged', async () => {
    const { session, storage } = setup(tellMe);
    const old = stored({ version: 1 }, 'old');
    const { nextNodeId: _n, nextEdgeId: _e, ...v1 } = old.file;
    await storage.put({ id: 'old', file: { ...v1, version: 1, nodes: [[0, 0, 0, 0]] } as never });
    await session.start();
    expect(told).toEqual([['info', 'Old was converted to version 2 of the data model and saved']]);
    await vi.runAllTimersAsync();
    const file = (await storage.list())[0]!.file;
    expect([file.version, file.nextNodeId, file.lastUpdatedAt]).toEqual([
      2,
      1,
      old.file.lastUpdatedAt,
    ]);
  });

  it('a project that is current says nothing', async () => {
    const { session, storage } = setup(tellMe);
    await storage.put(stored({}, 'now'));
    await session.start();
    expect(told).toEqual([]);
  });
});

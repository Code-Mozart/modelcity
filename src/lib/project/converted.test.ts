import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetClock, setup } from '../testing/sessionHelpers';
import { toFile } from './file';
import { emptyGraph, addNode } from '../model/graph';
import type { ToastKind } from '../ui/toasts.svelte';

const told: [ToastKind, string][] = [];
const tellMe = (kind: ToastKind, text: string) => told.push([kind, text]);

const AT = '2026-11-01T00:00:05Z';
const file = () =>
  toFile({
    title: 'Old',
    createdAt: '2026-11-01T00:00:00Z',
    lastUpdatedAt: AT,
    camera: { x: 0, y: 0, scale: 4, rotation: 0 },
    graph: addNode(emptyGraph(), { x: 0, y: 0, th: 0 }).graph,
  });

beforeEach(() => {
  told.length = 0;
  resetClock();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('a stored project of an older data model (^1226)', () => {
  it('is converted when it opens: a toast says so and it is saved in the new version, the date unchanged', async () => {
    const { session, storage } = setup(tellMe);
    const v1: Record<string, unknown> = { ...file(), version: 1 };
    delete v1.nextNodeId;
    delete v1.nextEdgeId;
    await storage.put({ id: 'old', file: v1 as never });
    await session.start();
    expect(told).toEqual([['info', 'Old was converted to version 2 of the data model and saved']]);
    await vi.runAllTimersAsync();
    const saved = (await storage.list())[0]!.file;
    expect([saved.version, saved.nextNodeId, saved.lastUpdatedAt]).toEqual([2, 1, AT]);
  });

  it('a project that is current says nothing', async () => {
    const { session, storage } = setup(tellMe);
    await storage.put({ id: 'now', file: file() });
    await session.start();
    expect(told).toEqual([]);
  });
});

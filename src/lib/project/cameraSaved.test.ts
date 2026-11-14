import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CameraState } from './file';
import { AUTOSAVE_MS, CAMERA_SAVE_MS } from './session.svelte';
import { click } from '../testing/editorHelpers';
import { resetClock, setup } from '../testing/sessionHelpers';

type S = ReturnType<typeof setup>;

/** A road of two nodes at (x, y), saved, with the camera put on `camera`. */
async function roadWithCamera(
  { session, editor, camera }: S,
  x: number,
  y: number,
  c: CameraState,
) {
  click(editor, 500, 500);
  click(editor, x, y);
  click(editor, x + 30, y + 10);
  editor.key('Escape');
  camera.setAnchors(editor.anchors);
  camera.restore(c);
  session.changed();
  await vi.advanceTimersByTimeAsync(AUTOSAVE_MS + 1);
}

const A: CameraState = { x: 100, y: 50, scale: 4, rotation: 0.5 };
const B: CameraState = { x: 330, y: 310, scale: 2, rotation: -0.3 };
const near = (c: CameraState, want: CameraState) => {
  expect(c.x).toBeCloseTo(want.x, 1);
  expect(c.y).toBeCloseTo(want.y, 1);
  expect(c.scale).toBeCloseTo(want.scale, 3);
  expect(c.rotation).toBeCloseTo(want.rotation, 3);
};

beforeEach(() => {
  resetClock();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("the camera of a project is saved and comes back (the user's report)", () => {
  it('opening another project puts its camera back, wherever the content of the one before was', async () => {
    const s = setup();
    await s.session.start();
    await roadWithCamera(s, 0, 0, A);
    const first = s.session.id;
    await s.session.newProject();
    await roadWithCamera(s, 300, 300, B);
    await s.session.open(first);
    near(s.camera.state, A);
    const second = (await s.storage.list()).find((p) => p.id !== first)!.id;
    await s.session.open(second);
    near(s.camera.state, B);
  });

  it('a new project starts with the standard camera, not with one pulled to the old content', async () => {
    const s = setup();
    await s.session.start();
    await roadWithCamera(s, 0, 0, A);
    await s.session.newProject();
    near(s.camera.state, { x: 0, y: 0, scale: 4, rotation: 0 });
  });

  it('restoring before the canvas has its size does not move the camera', async () => {
    const s = setup();
    s.camera.size = { width: 1, height: 1 };
    s.camera.setAnchors([{ kind: 'point', x: 0, y: 0, r: 7 }]);
    s.camera.restore(A);
    s.camera.size = { width: 1000, height: 800 };
    s.camera.setAnchors([{ kind: 'point', x: 0, y: 0, r: 7 }]);
    near(s.camera.state, A);
  });
});

describe('a camera that only moved is saved when it rests, without a change of the date (^236)', () => {
  it('after a pause, with the date as it was; not when it did not move', async () => {
    const s = setup();
    await s.session.start();
    await roadWithCamera(s, 0, 0, A);
    const [saved] = await s.storage.list();
    const put = vi.spyOn(s.storage, 'patch');
    s.camera.restore({ ...A, x: A.x + 30 });
    s.session.cameraMoved();
    await vi.advanceTimersByTimeAsync(CAMERA_SAVE_MS - 10);
    expect(put).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(20);
    expect(put).toHaveBeenCalledTimes(1);
    const [now] = await s.storage.list();
    expect(now!.file.camera.x).toBeCloseTo((A.x + 30) * 1000, -1);
    expect(now!.file.lastUpdatedAt).toBe(saved!.file.lastUpdatedAt);
    s.session.cameraMoved();
    await vi.advanceTimersByTimeAsync(CAMERA_SAVE_MS + 10);
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('with no project and an empty map nothing is saved', async () => {
    const s = setup();
    await s.session.start();
    const put = vi.spyOn(s.storage, 'patch');
    s.camera.restore({ ...A, x: 5 });
    s.session.cameraMoved();
    await vi.advanceTimersByTimeAsync(CAMERA_SAVE_MS + 10);
    expect(put).not.toHaveBeenCalled();
  });
});

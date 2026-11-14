import { describe, expect, it } from 'vitest';
import { Camera } from '../camera/camera.svelte';
import { projectKeyOf } from '../project/projectKeys';
import { APP_CONTROLS, appHints } from './appControls';

const camera = () => {
  const c = new Camera();
  c.size = { width: 800, height: 600 };
  return c;
};

/** Each control of the table, done on the real thing: what it does, as a change of the camera or the answer of the key (^783). */
const DOES: Record<number, () => unknown> = {
  722: () => {
    const c = camera();
    c.startPan({ x: 100, y: 100 });
    c.movePan({ x: 160, y: 100 });
    return c.view.cx !== 0;
  },
  723: () => {
    const c = camera();
    c.zoomWheel(-200, { x: 400, y: 300 });
    return c.view.scale > 4;
  },
  725: () => {
    const c = camera();
    c.startRotate({ x: 400, y: 300 });
    c.moveRotate({ x: 500, y: 300 });
    return c.view.rot !== 0;
  },
  400: () =>
    projectKeyOf({ key: 'p', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }) ===
    'projects',
};

describe('the controls of the app (^722, ^723, ^725, ^400)', () => {
  it('say what they do in this order', () => {
    expect(appHints(() => false).map((h) => h.text)).toEqual(['pan', 'zoom', 'rotate', 'projects']);
  });

  it.each(APP_CONTROLS.map((c) => [c.hat]))('control ^%i does what its hint says', (hat) => {
    expect(DOES[hat]!()).toBe(true);
  });

  it('every control of the table has such a scenario, and no other has one', () => {
    expect(Object.keys(DOES).map(Number).sort()).toEqual(APP_CONTROLS.map((c) => c.hat).sort());
  });

  it('a camera control that was used lately has no hint, the projects always has one (^110)', () => {
    expect(appHints((id) => id === 'pan').map((h) => h.text)).toEqual([
      'zoom',
      'rotate',
      'projects',
    ]);
    expect(appHints(() => true).map((h) => h.text)).toEqual(['projects']);
  });
});

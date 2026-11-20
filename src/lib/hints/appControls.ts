import { hintsOf, type Control } from './controls';
import type { Hint } from './hints';
import { key, mouse } from './inputs';

/** The controls that exist in every state of the app, so far: the camera and the projects (^722, ^723, ^725, ^400). */
const yes = () => true;
const row = (
  hat: number,
  input: Control<null>['input'],
  says: string,
  id?: Control<null>['id'],
): Control<null> => ({
  hat,
  input,
  id,
  on: yes,
  listens: yes,
  says: () => says,
});

/** In the order of the hints. The camera hints are hidden for a while after they were used (^110). */
export const APP_CONTROLS: Control<null>[] = [
  row(722, mouse('rmb', true), 'pan', 'pan'),
  row(723, { kind: 'wheel' }, 'zoom', 'zoom'),
  row(725, mouse('mmb', true), 'rotate', 'rotate'),
  row(400, key('P'), 'projects'),
];

/** The hints of the app, without those of the controls the user used lately (`hidden`, ^110). */
export const appHints = (hidden: (id: NonNullable<Hint['id']>) => boolean): Hint[] =>
  hintsOf(APP_CONTROLS, null).filter((h) => !(h.id && hidden(h.id)));

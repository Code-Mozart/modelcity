import { FEATURES } from '../features';
import type { Vec } from '../curves/vec';

/** The debug aids (^833, ^368): hidden, off by default, switched on with a key that has no hint. */
export class DebugTools {
  /** The mouse coordinates under the version (^833). */
  coordinates = $state<boolean>(FEATURES.debugCoordinates);

  toggleCoordinates() {
    this.coordinates = !this.coordinates;
  }
}

/** `Ctrl+Period` switches the mouse coordinates on and off (^833). */
export const isCoordinatesKey = (
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
) => (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '.';

/** The world position of the pointer in meters, as the coordinates show it. */
export const coordinatesText = (pt: Vec | null | undefined): string =>
  pt ? `x ${pt.x.toFixed(3)} m, y ${pt.y.toFixed(3)} m` : 'x -, y -';

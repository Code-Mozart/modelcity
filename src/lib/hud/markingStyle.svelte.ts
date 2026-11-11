/**
 * Which lane markings are drawn (^975, ^1040): the logical ones (pixels, the same at every zoom)
 * or the physical ones (meters, growing with the camera). `Ctrl+/` switches, a hidden control with
 * no hint (like `Ctrl+Period`, ^833); the logical ones are the default.
 */
export class MarkingStyle {
  physical = $state(false);

  toggle() {
    this.physical = !this.physical;
  }
}

/** `Ctrl+/` (or `Cmd+/`) switches the marking style (^1040). */
export const isMarkingStyleKey = (
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
) => (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '/';

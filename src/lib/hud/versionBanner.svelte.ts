/** How long without any input until the version shows again (^787, assumed). */
export const IDLE_MS = 60_000;

/**
 * When the version is shown (^787): at page load until the first input, and again after some time
 * without input. Any input (pointer, key, wheel) hides it and starts the time again.
 */
export class VersionBanner {
  visible = $state(true);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private idleMs = IDLE_MS) {}

  /** The user did something. */
  used() {
    this.visible = false;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => (this.visible = true), this.idleMs);
  }
}

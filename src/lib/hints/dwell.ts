/** How long a snap suggestion is followed before the tip about pinning shows, and how often it may show (^258). */
export const DWELL_MS = 1500;
export const TIP_EVERY_MS = 60_000;

/**
 * Notices that the same thing is followed for a while (^258): `follow(key)` says what the pointer is
 * pulled to now (null: nothing); `tip` runs once it stays the same for `DWELL_MS`, at most once per
 * `TIP_EVERY_MS`. Nothing is pinned by following: the tip only says how to pin.
 */
export class Dwell {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private key: string | null = null;
  private last = -Infinity;

  constructor(
    private tip: () => void,
    private now: () => number = Date.now,
  ) {}

  follow(key: string | null) {
    if (key === this.key) return;
    this.key = key;
    clearTimeout(this.timer);
    if (key !== null) this.timer = setTimeout(() => this.fire(), DWELL_MS);
  }

  private fire() {
    if (this.now() - this.last < TIP_EVERY_MS) return;
    this.last = this.now();
    this.tip();
  }
}

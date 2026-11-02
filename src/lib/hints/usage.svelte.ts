import type { ControlId } from './hints';

/** How long a control that was used is considered learned, and its hint stays hidden (user, ^110: 5 minutes for now). */
export const LEARNED_MS = 5 * 60 * 1000;

/**
 * Which controls the user used, and when (^110): the hint of a control that was used within the
 * last `LEARNED_MS` is hidden, each control on its own. Not stored: a new session starts with all
 * hints shown.
 */
export class Usage {
  private last = $state.raw<Partial<Record<ControlId, number>>>({});
  private now = $state(0);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private clock: () => number = () => Date.now()) {
    this.now = clock();
  }

  /** The user used this control. */
  mark(id: ControlId) {
    this.now = this.clock();
    this.last = { ...this.last, [id]: this.now };
    this.watch();
  }

  /** Whether the hint of the control is hidden right now. */
  hidden = (id: ControlId): boolean => {
    const at = this.last[id];
    return at !== undefined && this.now - at < LEARNED_MS;
  };

  /** Bring the hints back when the first used control runs out (the time is only looked at then). */
  private watch() {
    clearTimeout(this.timer);
    const times = Object.values(this.last).filter((t) => this.now - t < LEARNED_MS);
    if (!times.length) return;
    const wait = Math.min(...times) + LEARNED_MS - this.now;
    this.timer = setTimeout(() => {
      this.now = this.clock();
      this.watch();
    }, wait + 1);
  }
}

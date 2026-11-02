import type { HistoryEvent } from '../editor/history';

/** How long the recent history panel stays after the last operation (^107). */
export const RECENT_MS = 3000;

/**
 * When the recent history panel is shown (^107): the second a step is taken, undone or redone,
 * and until the interval has passed without another one.
 */
export class Recent {
  visible = $state(false);
  private seen = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  /** Take in what the editor reports (called when its `event` changes). */
  consume(event: HistoryEvent | null) {
    clearTimeout(this.timer);
    if (!event) {
      this.visible = false;
      return;
    }
    if (event.seq <= this.seen) return this.hideLater();
    this.seen = event.seq;
    this.visible = true;
    this.hideLater();
  }

  /** The interval starts again from now (also when something pins the panel and then lets go). */
  hideLater() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => (this.visible = false), RECENT_MS);
  }
}

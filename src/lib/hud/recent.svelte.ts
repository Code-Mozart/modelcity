import type { HistoryEvent, Step } from '../editor/history';

/** How long an item of the recent history panel stays after it is done (^107). */
export const RECENT_MS = 3000;

/** An item of the panel: one step, or a batch of steps that goes on while its kind goes on (^108). */
export interface RecentItem {
  key: number;
  batch: number | null;
  /** `undo: ` or `redo: ` for what an undo or redo moved (^107), else empty. */
  prefix: string;
  steps: Step[];
  /** The batch can still get steps. */
  open: boolean;
}

/**
 * The recent history panel (^107, ^108): what the history just did, for a few seconds. A single
 * step goes after the interval; a batch of several steps stays until it is finished, and then
 * goes after the interval, too.
 */
export class Recent {
  items = $state.raw<RecentItem[]>([]);
  private keys = 0;
  private seen = 0;
  private timers: Record<number, ReturnType<typeof setTimeout>> = {};

  /** Take in what the editor reports (called when its `event` changes). */
  consume(event: HistoryEvent | null) {
    if (!event) return this.clear();
    if (event.seq <= this.seen) return;
    this.seen = event.seq;
    if (event.kind === 'step') this.step(event);
    else {
      this.closeAll();
      this.add({ batch: null, prefix: `${event.kind}: `, steps: event.steps, open: false });
    }
  }

  clear() {
    for (const t of Object.values(this.timers)) clearTimeout(t);
    this.timers = {};
    this.items = [];
  }

  private step({ steps: [step], open }: HistoryEvent) {
    const batch = step!.batch;
    for (const item of this.items) if (item.open && item.batch !== batch) this.close(item);
    const item = this.items.find((i) => i.prefix === '' && i.batch === batch);
    if (!item) return this.add({ batch, prefix: '', steps: [step!], open });
    this.update({ ...item, steps: [...item.steps, step!], open });
  }

  private add(item: Omit<RecentItem, 'key'>) {
    const added = { ...item, key: ++this.keys };
    this.items = [...this.items, added];
    this.schedule(added);
  }

  private update(item: RecentItem) {
    this.items = this.items.map((i) => (i.key === item.key ? item : i));
    this.schedule(item);
  }

  private close(item: RecentItem) {
    this.update({ ...item, open: false });
  }

  private closeAll() {
    for (const item of this.items) if (item.open) this.close(item);
  }

  /** A single step, and a finished batch, go after the interval; an open batch stays. */
  private schedule(item: RecentItem) {
    clearTimeout(this.timers[item.key]);
    if (item.steps.length > 1 && item.open) return;
    this.timers[item.key] = setTimeout(() => {
      delete this.timers[item.key];
      this.items = this.items.filter((i) => i.key !== item.key);
    }, RECENT_MS);
  }
}

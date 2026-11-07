/** The kinds of message, with the icon of each (^210). */
export type ToastKind = 'info' | 'warning' | 'success' | 'error';

export interface Toast {
  key: number;
  kind: ToastKind;
  text: string;
  /** A message that stays while it is true, under this name (^827). */
  permanent?: string;
}

/** How long a toast stays (assumed, ^232): confirmations 3 s, like the history panel; warnings and errors 8 s. */
export const TOAST_MS = 3000;
export const TOAST_LONG_MS = 8000;

/**
 * The toasts (^232): short messages for what just happened. They go by themselves. A message that
 * is showing already does not appear twice (a key held down, a click repeated): its time starts
 * again.
 */
export class Toasts {
  items = $state.raw<Toast[]>([]);
  private keys = 0;
  private timers: Record<number, ReturnType<typeof setTimeout>> = {};

  /**
   * A message that does not go by itself, while something is wrong (^827): `null` takes it away.
   * Showing it again changes its text in place.
   */
  keep(name: string, message: { kind: ToastKind; text: string } | null) {
    const was = this.items.find((t) => t.permanent === name);
    if (!message) {
      if (was) this.items = this.items.filter((t) => t !== was);
      return;
    }
    if (was?.kind === message.kind && was.text === message.text) return;
    const toast = { key: was?.key ?? ++this.keys, ...message, permanent: name };
    this.items = was ? this.items.map((t) => (t === was ? toast : t)) : [...this.items, toast];
  }

  show(kind: ToastKind, text: string) {
    const same = this.items.find((t) => t.kind === kind && t.text === text);
    const toast = same ?? { key: ++this.keys, kind, text };
    if (!same) this.items = [...this.items, toast];
    clearTimeout(this.timers[toast.key]);
    const long = kind === 'warning' || kind === 'error';
    this.timers[toast.key] = setTimeout(
      () => {
        delete this.timers[toast.key];
        this.items = this.items.filter((t) => t.key !== toast.key);
      },
      long ? TOAST_LONG_MS : TOAST_MS,
    );
  }
}

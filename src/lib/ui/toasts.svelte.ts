/** The kinds of message, with the icon of each (^210). */
export type ToastKind = 'info' | 'warning' | 'success' | 'error';

export interface Toast {
  key: number;
  kind: ToastKind;
  text: string;
}

/** How long a toast stays (assumed, ^232): confirmations 3 s, like the history panel; warnings and errors 8 s. */
export const TOAST_MS = 3000;
export const TOAST_LONG_MS = 8000;

/** The toasts (^232): short messages for what just happened. They go by themselves. */
export class Toasts {
  items = $state.raw<Toast[]>([]);
  private keys = 0;

  show(kind: ToastKind, text: string) {
    const toast = { key: ++this.keys, kind, text };
    this.items = [...this.items, toast];
    const long = kind === 'warning' || kind === 'error';
    setTimeout(
      () => (this.items = this.items.filter((t) => t.key !== toast.key)),
      long ? TOAST_LONG_MS : TOAST_MS,
    );
  }
}

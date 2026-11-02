import { getContext } from 'svelte';

export type MouseButton = 'lmb' | 'mmb' | 'rmb';

/** What the symbols of the control hints need to know to show a key or a button pressed (^243). */
export interface HeldView {
  /** Whether the key with this label (`Ctrl`, `Z`, `Esc`, ...) is down. */
  key(label: string): boolean;
  /** Whether the button is down, and (drag) it has been moved with, or (no drag) not yet. */
  mouse(button: MouseButton, drag: boolean): boolean;
}

/** Nothing is held: what the symbols see where nobody told them (tests, other pages). */
export const NOTHING_HELD: HeldView = { key: () => false, mouse: () => false };

/** The key of the context the app gives its `HeldView` under. */
export const HELD = Symbol('held');
export const heldView = (): HeldView => getContext<HeldView | undefined>(HELD) ?? NOTHING_HELD;

/** The label a hint shows for a key of the keyboard: `Control` is `Ctrl`, a letter is its capital. */
export function keyName(e: { key: string; code: string }): string {
  const named: Record<string, string> = {
    Control: 'Ctrl',
    Meta: 'Ctrl',
    Escape: 'Esc',
    Delete: 'Del',
    Backspace: 'Del',
  };
  if (e.code.startsWith('Key')) return e.code.slice(3);
  return named[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);
}

/** Which keys and mouse buttons are down right now (^243). */
export class Held {
  keys = $state.raw<readonly string[]>([]);
  buttons = $state.raw<Record<MouseButton, boolean>>({ lmb: false, mmb: false, rmb: false });

  /** A key event: the key, and the modifiers as the event says they are (a missed key up cannot stick). */
  private change(e: KeyboardEvent, down: boolean) {
    const modifiers: [string, boolean][] = [
      ['Ctrl', e.ctrlKey || e.metaKey],
      ['Shift', e.shiftKey],
      ['Alt', e.altKey],
    ];
    const name = keyName(e);
    const keep = (k: string) => k !== name && !modifiers.some(([m]) => m === k);
    const on = modifiers.filter(([, held]) => held).map(([m]) => m);
    this.keys = [...this.keys.filter(keep), ...on, ...(down && !on.includes(name) ? [name] : [])];
  }

  keyDown(e: KeyboardEvent) {
    this.change(e, true);
  }

  keyUp(e: KeyboardEvent) {
    this.change(e, false);
  }

  button(button: MouseButton, down: boolean) {
    this.buttons = { ...this.buttons, [button]: down };
  }

  /** The window lost the focus: nothing is held any more as far as the page can know. */
  clear() {
    this.keys = [];
    this.buttons = { lmb: false, mmb: false, rmb: false };
  }

  /** The symbols' view of it; `moved(button)`: the button has been dragged. */
  view(moved: (button: MouseButton) => boolean): HeldView {
    return {
      key: (label) => this.keys.includes(label),
      mouse: (button, drag) => this.buttons[button] && moved(button) === drag,
    };
  }
}

import type { PointerInfo } from './types';

/** The keys held: `Ctrl` is left as it was when it is not told. */
export interface Keys {
  alt: boolean;
  shift: boolean;
  ctrl?: boolean;
}

/** The pointer as it was, with other keys held, and whether any of them changed (^99, ^801). */
export function withKeys(
  info: PointerInfo | null,
  { alt, shift, ctrl }: Keys,
): { info: PointerInfo | null; changed: boolean } {
  if (!info) return { info, changed: false };
  const next = { ...info, alt, shift, ctrl: ctrl ?? info.ctrl };
  return {
    info: next,
    changed: next.alt !== info.alt || next.shift !== info.shift || next.ctrl !== info.ctrl,
  };
}

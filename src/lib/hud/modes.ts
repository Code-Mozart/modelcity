import type { Phase } from '../editor/phase';

/** The label text and color of each mode (^119). */

/** How long the mode name stays up after a change (^119: less than a second). */
export const LABEL_MS = 800;

export const MODES: Record<Phase, { label: string; color: string }> = {
  select: { label: 'select mode', color: 'var(--blue)' },
  draw: { label: 'draw mode', color: 'var(--ink)' },
  extend: { label: 'extend mode', color: 'var(--orange)' },
};

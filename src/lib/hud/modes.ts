import type { IconName } from '../ui/Icon.svelte';
import type { Phase } from '../editor/phase';

/** The label text and color of each mode (^119). */

/** How long the mode name stays up after a change (^119: less than a second). */
export const LABEL_MS = 800;

export const MODES: Record<Phase, { label: string; color: string; icon: IconName }> = {
  select: { label: 'select mode', color: 'var(--blue)', icon: 'select' },
  draw: { label: 'draw mode', color: 'var(--ink)', icon: 'pen' },
  extend: { label: 'extend mode', color: 'var(--orange)', icon: 'extend' },
};

/** The modes in the order they are shown. */
export const PHASES: Phase[] = ['select', 'draw', 'extend'];

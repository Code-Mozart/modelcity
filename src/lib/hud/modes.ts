import type { IconName } from '../ui/Icon.svelte';
import type { Phase } from '../editor/phase';

/** The label text and color of each mode (^119). */

export const MODES: Record<
  Phase,
  { label: string; color: string; outline: string; icon: IconName }
> = {
  select: { label: 'select mode', color: 'var(--blue)', outline: 'var(--blue)', icon: 'select' },
  draw: { label: 'draw mode', color: 'var(--ink)', outline: 'var(--ink)', icon: 'pen' },
  extend: {
    label: 'extend mode',
    color: 'var(--orange)',
    outline: 'var(--orange)',
    icon: 'extend',
  },
  view: { label: 'view mode', color: 'var(--ink)', outline: 'transparent', icon: 'eye' },
};

/** The modes in the order they are shown. */
export const PHASES: Phase[] = ['select', 'draw', 'extend', 'view'];

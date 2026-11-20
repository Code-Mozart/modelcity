import type { Phase } from '../editor/editor.svelte';
import type { IconName } from '../ui/Icon.svelte';

/** The label text and color of each mode (^119); extend mode is draw mode while a road is drawn (^120). */
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
export const PHASES: Phase[] = ['view', 'select', 'draw', 'extend'];

/** View mode shows only itself and select mode, its way out (^104). */
export const shownIn = (phase: Phase): Phase[] => (phase === 'view' ? ['view', 'select'] : PHASES);

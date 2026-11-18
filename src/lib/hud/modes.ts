import type { Mode } from '../editor/editor.svelte';
import type { IconName } from '../ui/Icon.svelte';

/** The label text and color of each mode (^119). Draw mode and extend mode come back with their operations (^1232). */
export const MODES: Record<
  Mode,
  { label: string; color: string; outline: string; icon: IconName }
> = {
  select: { label: 'select mode', color: 'var(--blue)', outline: 'var(--blue)', icon: 'select' },
  view: { label: 'view mode', color: 'var(--ink)', outline: 'transparent', icon: 'eye' },
};

/** The modes in the order they are shown. */
export const PHASES: Mode[] = ['view', 'select'];

/** View mode shows only itself and select mode, its way out (^104); so far there are no others to show. */
export const shownIn = (mode: Mode): Mode[] => (mode === 'view' ? ['view', 'select'] : PHASES);

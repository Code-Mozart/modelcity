/** The three modes (^120): extend mode is draw mode while a node is being extended. */
export type Phase = 'select' | 'draw' | 'extend';

export const phaseOf = (mode: 'select' | 'draw', active: number | null): Phase =>
  mode === 'select' ? 'select' : active === null ? 'draw' : 'extend';

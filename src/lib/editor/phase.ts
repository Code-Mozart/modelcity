/** The four modes (^104, ^120): extend mode is draw mode while a node is being extended. */
export type Phase = 'select' | 'draw' | 'extend' | 'view';

export const phaseOf = (mode: 'select' | 'draw', active: number | null, viewing = false): Phase =>
  viewing ? 'view' : mode === 'select' ? 'select' : active === null ? 'draw' : 'extend';

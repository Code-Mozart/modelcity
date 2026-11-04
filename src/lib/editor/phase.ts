/** The four modes (^104, ^120): extend mode is draw mode while a node is being extended. */
export type Phase = 'select' | 'draw' | 'extend' | 'view';

export const phaseOf = (mode: 'select' | 'draw', active: number | null, viewing = false): Phase =>
  viewing ? 'view' : mode === 'select' ? 'select' : active === null ? 'draw' : 'extend';

/**
 * Whether all scaffold gizmos are hidden (^60, ^362): while several nodes are moved (^78), while `Ctrl`
 * holds the snapping off (^287), while a drop merges (^284), and in extend mode, where only the
 * skeleton and the preview of the segment being built show.
 */
export const scaffoldHidden = (s: {
  phase: Phase;
  movingGroup: boolean;
  ctrl: boolean;
  dropping: boolean;
}): boolean => s.phase === 'extend' || s.movingGroup || s.ctrl || s.dropping;

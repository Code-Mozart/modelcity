/**
 * Features that are built but switched off. A switched-off feature must have a hat that says why
 * and what decides its return (no always-hidden features, see .claude/CLAUDE.md).
 */
export const FEATURES = {
  /** The background grid (^35). Kept in the code (`View.gx/gy`, `drawGrid`), not shown. */
  grid: false,
} as const;

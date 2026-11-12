/**
 * Features that are built but switched off. A switched-off feature must have a hat that says why
 * and what decides its return (no always-hidden features, see .claude/CLAUDE.md).
 */
export const FEATURES = {
  /** The background grid (^35). Kept in the code (`View.gx/gy`, `drawGrid`), not shown. */
  grid: false,
  /** The mouse coordinates under the version (^833): a debug aid, switched on by `Ctrl+Period`, which has no hint; it comes back to the default only if the user decides to keep it visible. */
  debugCoordinates: false,
} as const;

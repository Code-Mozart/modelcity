/**
 * Features that are built but switched off. A switched-off feature must have a hat that says why
 * and what decides its return (no always-hidden features, see .claude/CLAUDE.md).
 */
export const FEATURES = {
  /** The background grid (^35). Kept in the code (`View.gx/gy`, `drawGrid`), not shown. */
  grid: false,
  /** The mouse coordinates under the version (^833): a debug aid, switched on by `Ctrl+Period`, which has no hint; it comes back to the default only if the user decides to keep it visible. */
  debugCoordinates: false,
  /** Physical lane markings (^975): dashes and width in meters, so they grow and shrink with the zoom. Switched off for the logical ones (pixels, ^976); the user decides whether they come back (for example at a zoom where they are readable, or per road style, ^964). */
  physicalMarkings: false,
} as const;

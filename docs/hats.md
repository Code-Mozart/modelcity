next: ^5

# Hats

Registry of all hats. Never reuse or renumber. Keep this file up to date.

| Hat | Type | Status | Summary |
|-----|------|--------|---------|
| ^1 | decision | decided | JS framework: **Svelte 5** (with Vite, on bun). Rendering of the map itself is Canvas 2D for now. |
| ^2 | milestone | approved by user | Infinite zoomable/pannable canvas with a 1 m x 2 m box in the center. Wheel/pinch zooms at cursor, drag pans. Scale 0.02 to 400 px/m, view center limited to ±2500 m. |
| ^3 | decision | decided | TypeScript pinned to 6.0.3 (not 5.9, which was an unverified guess; thanks Leo). TS 7.0 lacks the programmatic API typescript-eslint needs; revisit at 7.1 stable (planned 2026-11-24). |
| ^4 | decision | decided | World coordinate system: meters, origin at map center, **y down** (like the screen). |

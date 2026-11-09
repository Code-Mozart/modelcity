# The palette (^900 to ^913, milestone ^914)

The colours of the map, after Google Maps. **The values live in one place only: `src/app.css`** (the CSS variable named in the table, with its light value in `:root` and its dark value in `@media (prefers-color-scheme: dark)`), so that this file cannot drift from the code. Light mode was measured from the user's screenshot of Google Maps (the most frequent pixel of each area, an outline from the pixel row across an edge); dark mode from the user's screenshot of Google Maps in dark mode (an outline that the image does not show distinctly was taken from the darkest pixel at the edge: `--building-edge`, `--road-edge`). One hat per colour; status `assumed` until the user confirms the values.

| Hat | CSS variable | What it is | Notes |
| --- | --- | --- | --- |
| ^900 | `--bg` | the land, the background of the map | |
| ^901 | `--city` | fill of the built-up area | not drawn yet |
| ^902 | (none) | stroke of the built-up area | decided: no outline |
| ^903 | `--park` | fill of parks and sports fields | not drawn yet |
| ^904 | (none) | stroke of parks and sports fields | decided: no outline |
| ^905 | `--building` | fill of a building footprint | not drawn yet |
| ^906 | `--building-edge` | stroke of a building footprint | not drawn yet |
| ^907 | `--road` | fill of a road that is not a highway | used for the road surface |
| ^908 | `--road-edge` | stroke of a road that is not a highway | used for the road outline |
| ^909 | `--highway` | fill of a highway | not drawn yet |
| ^910 | `--highway-edge` | stroke of a highway (blue in light mode, green in dark mode) | not drawn yet |
| ^911 | `--marking-white` | white lane marking | not drawn yet (lanes and markings, ^156) |
| ^912 | `--marking-yellow` | yellow lane marking | not drawn yet (lanes and markings, ^156) |
| ^913 | `--sand` | other land use (the beige area in light mode) | not drawn yet; extra |

Not part of the palette: `--glow`, the halo behind text and icons on the map, which is white in light mode and black in dark mode whatever the land colour is.

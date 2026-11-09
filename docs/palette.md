# The palette (^900 to ^913, milestone ^914)

The colours of the map, after Google Maps. **Light mode** is measured from the user's screenshot (the most frequent pixel of each area, an outline from the pixel row across an edge); **dark mode** is made up (not important, ^914). One hat per colour. Status `assumed`: Claude read the value from the image and the user has not confirmed it.

| Hat | Token | Light | Dark | Where it is in the image |
| --- | --- | --- | --- | --- |
| ^900 | `bg` (the land, the background of the map) | `#d3f8e2` | `#1f2b26` | the light green of the open land |
| ^901 | `city` fill (built-up area) | `#f8f7f7` | `#2a2d33` | the off-white of the built-up area |
| ^902 | `city` stroke | none | none | no outline in the image (user: none) |
| ^903 | `park` fill (parks, sports fields) | `#a9eac2` | `#254033` | the darker green of the sports field |
| ^904 | `park` stroke | none | none | no outline in the image (user: none) |
| ^905 | `building` fill | `#e8e9ed` | `#333844` | the footprints |
| ^906 | `building` stroke | `#d7dae7` | `#3d4350` | the thin edge of a footprint |
| ^907 | `road` fill (not a highway) | `#abbac9` | `#55657a` | the grey-blue roads (used for now) |
| ^908 | `road` stroke | `#9dadbd` | `#3f4c5e` | the outer edge of such a road |
| ^909 | `highway` fill | `#8ba5c1` | `#4a6285` | the blue carriageways |
| ^910 | `highway` stroke | `#6780b0` | `#354a6b` | the edge of the carriageways |
| ^911 | `marking-white` | `#ffffff` | `#e8eaf0` | the dashed lane lines |
| ^912 | `marking-yellow` | `#ffdc36` | `#d9b72a` | the line between the carriageways |
| ^913 | `sand` (other land use, extra) | `#f5f0e5` | `#2f2c26` | the beige area at the top; extracted for later |

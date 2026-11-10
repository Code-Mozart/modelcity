# Road styles (^964, rented hats ^965 to ^970)

A **road style** is what makes a road look and behave like a kind of road: the width of its lanes, the speed it is for, the rules of its markings and its fill and stroke colours. The styles are German road classes (the user's research, ^964). **Planned, not built**: today every road is an *Ortsstraße* (^971), which is what the default lane configuration (3 m, `LANE_WIDTH_M`, `docs/data-model.md`) and the markings of ^949 already do; the data model does not change until the milestone of ^964 (it will need a version bump and a migration, ^173, and the user's agreement).

## The styles

Status of every row: the values are the user's suggestion (^964); the speed column is not decided yet (see *Open*). Marking rules are *stroke : gap* of a dashed centerline in meters (`^973`).

| Hat | Style (German) | Width per lane | Marking rules | Colours | Notes |
| --- | --- | --- | --- | --- | --- |
| ^965 | Feldweg (track) | 4 m | none | Feldweg colours, to be measured (see *Colours* below) | never more than one lane: a validator rule is planned (^973) |
| ^966 | Ortsstraße (street in a town) | 3 m | 3 m : 3 m, **no marking on a 1+1** (^972) | default (`--road`, `--road-edge`) | **the style of all roads for now (^971)** |
| ^967 | Hauptverkehrsstraße (main road of a town) | 3.25 m | 3 m : 3 m | default | |
| ^968 | Landstraße (L, B or K: Landesstraße, Bundesstraße, Kreisstraße, country road) | 3.5 m | 3 m : 6 m | default | the pattern the markings use today (^954, until ^971) |
| ^969 | Bundesstraße (B, federal road) | 3.75 m | 3 m : 6 m | highway colours (`--highway`, `--highway-edge`) and yellow lines (`--marking-yellow`) | |
| ^970 | Autobahn (A, Bundesautobahn) | 3.5 m | 6 m : 12 m | highway colours and yellow lines | |

L = Landesstraße, B = Bundesstraße, K = Kreisstraße, A = Bundesautobahn. (The user's table has the Landstraße row cover L, B and K, and then a Bundesstraße row of its own with highway colours: a B road is one or the other by where it runs; sorted out when the milestone is scoped.)

## What the styles change

- **Lane width** (^26): the hull of a segment and the surface (^923, ^945), the touching of nodes and so the parallel segments (^100, ^817) all use one lane width today (`LANE_WIDTH_M`). With styles a lane has the width of its style; lanes of different widths side by side are the open problem of ^26 (the centerline between lanes of different widths lies on their shared border, ^958).
- **Markings** (^949): the stroke and gap of the dashes (^973) and whether a line is drawn at all (^972 for a 1+1 Ortsstraße, the Feldweg has none).
- **Colours**: fill and stroke of the surface (^946) and the colour of the lines (the yellow lines come with the Bundesstraße and the Autobahn, ^953).
- **Speed**: each style has a speed it is for (not decided; for the traffic simulation of the roadmap, ^23 and later).

## The rules recorded now

| Hat | Rule | Status |
| --- | --- | --- |
| = ^971 | **Ortsstraße is the style of all roads for now (user).** No change to the data model or the default lane configuration; the code names the Ortsstraße where it is the style (`curves/lane.ts`: lane width, dash and gap). The milestone ^964 makes the style part of the lane configuration. | decided |
| = ^972 | **A 1+1 Ortsstraße has no centerline (user, answer to a question).** Group of two segments running opposite ways: nothing is drawn. Other groups follow ^951: two lanes of one way are dashed 3 m : 3 m; in a group of three or more the line between the ways is solid. This replaces the exception of ^951 (a 1+1 is dashed) for the Ortsstraße. | decided |
| = ^973 | **Marking patterns by style (user's research):** in towns 3 m stroke, 3 m gap; on a Landstraße 3 m : 6 m (what ^954 used until now); on an Autobahn 6 m : 12 m. The Feldweg has no markings and must never have more than one lane; a **validator rule** for this (like those of ^827) is wanted when the styles come (planned, roadmap). | decided (patterns); planned (validator) |

## Colours

The values of the palette live in `src/app.css` (`docs/palette.md`). Measured from the user's dark-mode screenshot (Google Maps, Android, the B 27 and the Oskar-von-Miller-Straße; `docs/mocks/hat963.jpg`, ^963), by the most frequent pixel of an area and the pixels across an edge (jpeg noise: about ±3 per channel):

| What | Dark mode | Same as the palette? |
| --- | --- | --- |
| land | `#133848` | `--bg` |
| the thin street (Oskar-von-Miller-Straße) fill | `#3f5a77` | **exactly `--road`** (^907) |
| its outline (darkest pixel at the edge) | `#152a3b` (the palette has `#3b5673` for `--road-edge`, from an earlier screenshot) | no: darker, ^908 stays until the user decides |
| the B 27 fill | `#47688b` | **no**: `--highway` is `#405977` (^909) |
| the B 27 green line | about `#3d7d49` to `#418346`, 15 px wide at the scale of the picture, with a darker rim | roughly `--highway-edge` `#398e3d` (^910) |
| the B 27 outer edge against the land | no dark outline, the fill meets the land | |
| a building | `#213e6a` | `--building` (^905) |

**The Feldweg:** the user says the Oskar-von-Miller-Straße is a Feldweg with its own fill and maybe its own stroke. Its fill is the same pixel value as the palette's `--road` for dark mode, so either Google draws a Feldweg like an ordinary street in dark mode, or `--road` was measured from a street of that class. The screenshot cannot tell; it needs a Feldweg and an ordinary street side by side (light and dark). Until then the Feldweg has the default colours (assumed).

# Lane markings (^949, rented hats ^950 to ^958)

The rules of the markings that are drawn on the road surface (^21, milestone ^949, part of ^156). **This file is the specification; the code follows it.** One hat per rule; status `decided` = the user's words, `assumed` = a detail Claude filled in. Built in PR #52 (`editor/markings.ts`, `render/markings.ts`). When the markings are built, every rule gets its row in `docs/features.md` with the test that covers it (and the scope of the milestone is in its PR description).

## Words (README glossary)

- **Parallel segments** (^100, ^334): two segments are parallel when their start nodes touch, their end nodes touch and their arcs are concentric. They share a **centerline**: the line half way between them, on the border of the two lanes.
- **Tower** (^819): nodes (real or derived, ^822) that touch and sit on one normal. Partly parallel segments exist through derived nodes (^822, ^364): the stretch where two segments are parallel runs from one node of a tower to the next, real or derived.
- **Group** (this file): a **run** of a tower on one side (^350, `runsOf` in `editor/towers.ts`): the neighbouring nodes whose segments on that side are parallel. A run of k nodes is k segments side by side, k >= 2. Only neighbours are parallel (a third lane between two others keeps them apart), so a group of k segments has k - 1 centerlines, one between each neighbouring pair.
- **Direction of a segment** is start to end. Two parallel segments are **opposite** when one runs from start to end where the other runs from end to start, **same** when both run the same way (the heading of their nodes at one end is the same or exactly opposite, ^254; whether the segments are opposite is decided by which of the touching nodes is the start of its segment).

## The rules

| Hat | Rule | Status |
| --- | --- | --- |
| ^950 | **A centerline for each neighbouring pair (user).** Every pair of parallel segments gets a marking on its centerline, between the two. Also when the segments are parallel only for a part of their length (^822): the marking runs along that stretch, from the node (real or derived) where the pair becomes parallel to the one where it stops. The surface is not marked where no pair is parallel (a single lane has no marking). | decided |
| ^951 | **Dashed or solid (user).** A pair that runs the **same way** gets a **dashed** line. A pair that runs **opposite ways** gets a **solid** line, **except** when the group has exactly **two** segments (a 1+1 road): then it is **dashed** too. So the line between the two directions of a road with two or more lanes in one direction is solid; the line between two lanes of one direction is dashed; the middle of a plain two-way road is dashed. | decided |
| ^952 | **Judged per stretch (assumed, follows from ^950).** The size of the group is not a property of a segment but of the place along it: where a third segment joins the group (a lane is added, a widening, a split) or leaves it, the group grows or shrinks at a node (real or derived) and the style of an opposite pair may change there, from dashed (2) to solid (3 or more) and back. The style changes at the node, never in the middle of a dash. | assumed |
| ^953 | **All lines are white for now (user).** Every centerline marking, dashed or solid, is `--marking-white` (^911), the Google Maps colour of the palette, light and dark. The yellow (`--marking-yellow`, ^912) comes with the highway markings (white and yellow) in a later milestone; until then no rule uses it. | decided |
| ^954 | **Dashes are in meters, the width has a floor in pixels (assumed).** A dash is 3 m long with a gap of 6 m (constants in `curves/lane.ts`, not tolerances, ^879); the dash pattern starts at the beginning of the stretch and runs continuously across the nodes in it (it does not restart at a node inside the stretch). The line is 0.15 m wide but never thinner than 1 px, like the outline of the surface (^946). Solid has no gaps. Because they are meters, the dashes grow and shrink with the zoom with the road. | assumed |
| ^955 | **Where it is drawn (assumed).** On top of the surface (^945), under everything that is a gizmo or a handle (the skeleton, nodes, bars, hover): the markings are part of the road, not of the editor. In view mode they are shown like the surface (^946). They lie within the surface, so no clipping is needed. | assumed |
| ^956 | **Derived, never stored (user, ^21).** The markings are generated from the graph like the surface; the stored data model does not change (`docs/data-model.md`). They follow every change of the graph (a drag, a delete, an undo) because they are derived from it (the `CLAUDE.md` principle), and a test shows this in general with random sequences of operations. | decided |

## Scope of the milestone ^949 (user: ^958 is no rule)

| Hat | What | Status |
| --- | --- | --- |
| ^958 | **Out of the milestone (for later):** the yellow and highway markings (^953), edge lines (the outline of the surface is the road edge, ^946), stop lines and the gaps at junctions (^157; where the markings of several groups meet they simply overlap until then), crossings (^158), lane types and different widths (^26: the centerline of two lanes of different widths lies on their shared border, so it must come from the lane widths, never from a constant), pedestrian and bike paths, arrows. The milestone is the rules ^950 to ^956 with white lines only. | decided |

## Questions

| Hat | Question | Recommendation |
| --- | --- | --- |
| ^957 | ~~One colour or two (^953)?~~ | decided (user): white only for now; yellow with the highway markings |

## Worked examples (n = the size of the group, from left to right in the order across the lanes; `>` runs start to end, `<` the other way)

| Road | Group | Lines between neighbours | Why |
| --- | --- | --- | --- |
| 1+1: `>` `<` | 2 | 1 dashed, white | opposite, but the group has two (^951 exception) |
| one-way, two lanes: `>` `>` | 2 | 1 dashed, white | same way |
| one-way, three lanes: `>` `>` `>` | 3 | 2 dashed, white | same way |
| 2+1: `>` `>` `<` | 3 | dashed white, then solid white | the second pair is opposite and the group has three |
| 2+2: `>` `>` `<` `<` | 4 | dashed white, solid white, dashed white | the middle pair is opposite, the group has four |
| 1+1 where a third lane `>` is added over the last 40 m: `>` `<` becomes `>` `>` `<` | 2, then 3 | dashed white, then (over the 40 m) dashed white + solid white | ^952: the group has three over the stretch |
| two segments parallel only over the middle 50 m of 100 m | 2 over the 50 m | one dashed line over those 50 m only | ^950: partly parallel |
| a lone lane | 1 | none | no pair |

## How it is built

1. `editor/markings.ts` (pure, no drawing): `markingsOf(graph)` returns a list of `{ piece(s) along the centerline, kind: 'dashed' | 'solid' }`. For each tower and side, for each run of nodes (as `barsOf` finds them), for each neighbouring pair `(a, b)` of the run, the parallel segments `ea`, `eb` of `a`, `b` (the test `parallel(g, ea, eb)` exists) give one centerline: the offset of either curve by half the lane width towards the other (`offsetPiece`, as the hulls do), its direction and the group size at that place.
2. The partly parallel stretches come out of the derived nodes (`withDerived`): the run is cut at every node of the tower, so every stretch has a constant group size.
3. `render/markings.ts` draws them with a dash pattern in meters (`setLineDash`), above `drawSurface` in `drawScene`.
4. Tests (`editor/markings.test.ts`), one per row of the examples above, plus: the number of lines is the number of neighbouring pairs; mirroring the road (swapping every segment's direction) swaps solid and dashed only through the direction; adding a lane mid-way changes the style at its node; random sequences of operations leave the markings equal to the markings of a fresh build.
5. Hats ^950 to ^956 get their rows in `docs/features.md`; the README glossary has *Centerline marking* and *Group* (this file).

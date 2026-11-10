# Junctions: the testing ground (^984, rented hats ^985 to ^999)

One project with the common kinds of junction, for the milestone of the junctions (^157): `docs/mocks/hat984.json` (import it in the projects modal). It is **made by code**, `src/lib/testing/junctionGround.ts` with the kit `junctionKit.ts` (arms with lanes, joined lane by lane), so a case can be added or changed in one line; `junctionGround.test` keeps the file equal to the code (`UPDATE_MOCKS=1 bunx vitest run src/lib/testing/junctionGround.test.ts` writes it again) and checks that it opens and that every segment has a curve. 269 nodes, 271 segments.

Right-hand traffic. Every lane in of an arm is joined to the lanes out of the other arms: a left turn from the innermost lane to the innermost, a right turn from the outermost to the outermost, straight on lane by lane. All radii are automatic. The cells of the grid are 260 m apart to the right and 240 m down; the center of a cell is the center of its junction.

| Hat | Center (m) | Case | What it is for |
| --- | --- | --- | --- |
| ^985 | 0, 0 | T-junction, 1+1 with 1+1 | the simplest junction (the user's ^962) |
| ^986 | 260, 0 | T-junction, main road 2+2, side road 1+1 | turns over more than one lane; the solid line of the main road at a junction |
| ^987 | 520, 0 | T-junction with a dedicated left-turn lane on the main road (a pocket that begins 50 m before), and two lanes out of the side road (left, right) | turn lanes; the lanes of the main road shift by a lane (S-curves); the gap they leave |
| ^988 | 0, 240 | X-junction, 1+1 with 1+1 | twelve turns over one square |
| ^989 | 260, 240 | X-junction, 2+2 with 1+1 | |
| ^990 | 520, 240 | X-junction, 2+2 with 2+2, a left-turn pocket on every arm | the big one: a median gap in every arm, left turns that cross in the middle |
| ^991 | 0, 480 | a one-way road of two lanes that loses its outer lane (merge) and gets it back (split) | merge lane, split lane |
| ^992 | 260, 480 | a one-way road of two lanes with an on-ramp (a lane alongside for 30 m, then it merges) and an off-ramp | ramps, partly parallel lanes |
| ^993 | 520, 480 | a fork: a 1+1 road splits into two 1+1 roads (Y) | arms at a flat angle |
| ^994 | 0, 720 | two single lanes that cross without a node | the 1 x 1 crossing |
| ^995 | 260, 720 | three one-way lanes across a 2+2 road, at an angle, without nodes | the multi-lane crossing of ^959 |
| ^996 | 520, 720 | a roundabout: one lane, radius 14 m, four 1+1 arms | a hole in the surface (an island), entries and exits |
| ^997 | 0, 960 | T-junction at 60 degrees | arms that are not square |
| ^998 | 260, 960 | a one-way street across a 1+1 road | arms with lanes one way only |
| ^999 | 520, 960 | a junction of five arms | many turns over one place (the lanes stop 12 m from the center) |

## What it shows today (before the milestone)

Seen by drawing the surface and the markings of the ground (v0.52.0):

- **Markings run through junctions.** Lanes that go straight on across a junction are parallel there too, so their line crosses the junction (^988 to ^990); turning lanes that are concentric (left and right turn of a T, ^985) get a curved line between them inside the junction.
- **Holes in the middle.** Where the hulls of the turning lanes do not cover all of the junction, small holes of land stay in the surface (^990: four in the middle).
- **Gaps that are islands.** The gap a turn pocket leaves (^987, ^990) and the middle of the roundabout (^996) are holes in the surface: this is where traffic islands (^27) would be.
- **Violations.** The validator counts 26 violations in the ground: in a junction a node is often one lane width from a turning curve that heads another way (^818). The rule is right between junctions and wrong inside them.
- **Crossings without a node** (^994, ^995) are one surface with all markings drawn across each other; they belong to the milestone of the crossings (^158).
- **Speed.** The surface of the whole ground takes about 0.2 s and its markings 0.07 s on every change of the graph (the performance milestone, ^927).

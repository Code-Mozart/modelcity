# History (^810)

Every merged PR of `main`, oldest first: what it did, the milestone hat where there is one, and the version it shipped as. Versions and monikers exist since #34 (^367, `package.json`); earlier PRs have none. The PR description is the full record (what, why, what to test, decisions). Dates are the merge day (UTC). A new row is added in the PR that follows a merge, or by the PR itself once it has a number.

| PR | Date | Version: moniker | Milestone / hat | What |
|---|---|---|---|---|
| #1 | 2026-10-29 | | ^2 | Project setup and pan/zoom canvas |
| #2 | 2026-10-30 | | ^13 | Port the through-node curve demo |
| #3 | 2026-10-30 | | ^19 to ^29 | Roadmap as hats |
| #4 | 2026-10-30 | | ^19 | Camera rotation and new pointer controls |
| #5 | 2026-10-30 | | ^37 | Camera cannot leave the content |
| #6 | 2026-10-30 | | ^40 | Road creation: blank canvas, left button creates and edits |
| #7 | 2026-10-30 | | ^70 to ^85 | Selection: box, group move, lanes, shared radius; blue = selected, orange gizmos |
| #8 | 2026-10-30 | | ^80, ^86 | Direction arrows along curves |
| #9 | 2026-10-30 | | ^81, ^88 | Undo / redo |
| #10 | 2026-10-30 | | ^21, ^90 | Road surface: 3 m lanes with outlines |
| #11 | 2026-10-31 | | ^23, ^92 to ^126 | Splits, merges and shared nodes; todo list registered |
| #12 | closed, not merged | | ^97 to ^120 | Todo list registered as hats (went in with #11) |
| #13 | 2026-10-31 | | | Consolidation: process terms, roadmap, e2e idea |
| #14 | 2026-10-31 | | | Refactor: move hit testing out of the editor |
| #15 | 2026-10-31 | | ^145 | End-to-end smoke test |
| #16 | 2026-10-31 | | | Docs: roadmap milestone sets, stale statuses |
| #17 | 2026-10-31 | | | Docs: milestones get hats instead of letters |
| #18 | 2026-10-31 | | ^161 | Data model design step |
| #19 | 2026-10-31 | | | Remove the stored shape tag: edges are derived from positions, headings and radius |
| #20 | 2026-10-31 | | | Extend the e2e test before the model swap |
| #21 | 2026-11-01 | | ^149 | The editor holds a graph (^106, ^105, ^162) |
| #22 | 2026-11-01 | | ^149 | Projects in the browser, autosave, export and import |
| #23 | 2026-11-01 | | ^215 | Refactoring pass after the persistence milestone |
| #24 | 2026-11-01 | | ^175 | Deploy to GitHub Pages |
| #25 | 2026-11-02 | | ^150 | History: batch undo, recent history panel |
| #26 | 2026-11-02 | | | Docs: roadmap review after ^149, ^150 and ^175; split ^151 |
| #27 | 2026-11-02 | | ^227 | Bugfix: a change that changes nothing is no history step |
| #28 | 2026-11-02 | | ^151 | Controls and hints |
| #29 | 2026-11-02 | | ^152 | Modes: select, draw, extend, view |
| #30 | 2026-11-03 | | ^153 | Snapping engine, part 1: node positions |
| #31 | 2026-11-04 | | ^255 | Snapping engine, part 2: all control points |
| #32 | 2026-11-04 | | ^370 | Consolidation, part 3 |
| #33 | 2026-11-06 | | ^371 | Controls audit |
| #34 | 2026-11-06 | v0.34.0: Version display and favicon | ^367, ^788 | Version display and favicon |
| #35 | 2026-11-06 | v0.35.0: Hints and controls fixes | ^791 | Hints and controls fixes |
| #36 | 2026-11-06 | v0.36.0: Snapping engine part 3 | ^794 | Snapping engine part 3 |
| #37 | 2026-11-06 | v0.37.0: Controls snapshot | ^784 | Controls snapshot |
| #38 | 2026-11-07 | v0.38.0: Controls as data | ^783 | Controls as data |
| #39 | 2026-11-07 | v0.39.0: History of milestones | ^810 | History of milestones; the hints for a click that narrows the selection (^809) |
| #40 | 2026-11-07 | | ^811 to ^829 | Docs: towers and derived nodes registered, milestones reshuffled |
| #41 | closed, not merged | | ^830 | Replaced by #42 (renamed) |
| #42 | closed, not merged | | ^830 to ^833 | Replaced by #43 (a general bug fix PR) |
| #43 | | v0.43.0: Bug fixes | ^830 to ^843 | Bug fixes: a radius point snaps only to places on its line and takes the exact radius of the arc beside it (the concentric bug); the orange line shows only when the parallels follow; `Ctrl+Period` shows the mouse coordinates |
| #44 | | v0.44.0: Version check | ^844 | CI checks that the version is the number of the PR |
| #45 | | v0.45.0: Towers and derived nodes | ^816 to ^825, ^827 | Touch, towers and derived nodes: the rules of parallel segments |
| #46 | | v0.46.0: Parallel S-curves | ^828, ^847 to ^849, ^850 to ^876 (found on the way: the tolerance of parallel, derived nodes at arc ends, the debug line, the glossary of the pieces of a curve) | S-curves beside each other: derived from the neighbour, one tower of inflection nodes |
| #47 | | v0.47.0: Tolerance and snapping | ^863 to ^868, ^877 to ^884 | One tolerance, the ranking and merging of snap suggestions, the heading follows the tower |
| #48 | | v0.48.0: Nodes without an effect dissolve | ^829, ^891 to ^899 | A node that changes nothing is removed after the operation that made it so |
| #49 | | v0.49.0: Google Maps palette and extend from end | ^900 to ^920 | The colours after Google Maps, `Alt`+`LMB` extend from end, and six minor items (^421, ^474, ^418, ^757, ^746, ^745) |
| #50 | | v0.50.0: Hulls and corners | ^921 to ^941 | The road surface is removed; the hulls of the segments and the corners where they cross in the debug layer; the performance milestone is registered |
| #51 | | v0.51.0: Road surface | ^944 to ^948 | The road surface generated as the outline of the union of the hulls |
| #52 | | v0.52.0: Lane markings | ^949 to ^983 | Dashed and solid centerlines between parallel segments, in pixels (the meter style kept, switched off), the road styles written down, the walking dots of the debug layer |
| #53 | | v0.53.0: Junctions | ^984 to ^1024 | Part 1 of the junctions: the testing ground, the road layout rules and the signs of the segments in the debug layer, pictures from the CI |
| #54 | | v0.54.0: Extension and merge markings | ^1025 to ^1066 | Junction markings: lane extensions and merges by towers and distances, dashed lines through them and only on the surface, gores with chevrons, the road surface with holes patched by size |
| #55 | 2026-11-12 | v0.55.0: Rechts vor links | ^1067 to ^1145 | Small T- and X-junctions as right-before-left by topological rules per node: give-way lines and arrows where a turn is missing, "right" under 150 degrees, no centerlines inside junctions, the testing grounds (priority, small T with edge cases, angles), the work timer |
| #56 | | v0.56.0: Collapse by control | ^1200 to ^1203 | Nodes no longer collapse by themselves: `C` collapses the selected nodes without an effect, with a toast when none can; the milestones performance and the rest of the junction markings are registered |

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

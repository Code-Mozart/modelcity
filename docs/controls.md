# Controls and features (^371)

**Status: the audit is in progress.** This file was started from blank on purpose; the previous reference is in the Git history (`git show origin/main:docs/controls.md`, last version before ^371). We fill the tables below one feature at a time, together, and take over everything from the old file that is still true. Until the PR of ^370 is merged, the old file stays the current reference.

## Definitions

- **Feature:** anything the app can do or show (a mode, a snap, a rendering, a measurement, an operation). Has a hat of type `feature`, or `operation` (see `docs/hats.md`; features and operations are listed there, not here).
- **Operation** (^180, ^391): something the user does that *writes*, or should write later: changes the map, exports, saves, imports, creates, renames or deletes a project; selecting counts once the selection is persisted (^390). Switching which project is open does not. Every operation is a feature; not every feature is an operation (a snap rule, a gizmo, a label is not).
- **Hats (^392):** every operation and every control has a hat for just itself. A hat that describes several things stays as the decision, and each thing gets its own hat that points to it.
- **Control:** one input (key, button or gesture, with its modifiers) that does something *in a given context*. Controls are contextual by design (^45), so every row names its **context**: the mode (view, select, draw, extend), what is under the pointer, and the state of the app (selection, drag, being drawn, touch).
- **Hat:** reused if the feature, control or operation already has one (^371 rule 1); registered first if not.

**Not audited in detail (user):** layout and colors. The audit records what exists, what it does and what it is tied to; where things sit, how big they are and which color they have is described only where it is the point of a feature (for example the blue border of the current card), and otherwise left to the design hats (^32, ^211).

## Columns

| Column | Meaning |
|--------|---------|
| Hat | The hat of the feature, control or operation. |
| Context | Mode, what is under the pointer, app state. |
| Control | The input, with modifiers. |
| Operation | What it does there. |
| Hint | The control hint (^181) it shows, or the recorded reason it has none (an exemption). |
| Visitable | Whether and how the hint can be visited (hovered or reached, ^259): yes (how), no (why). |
| Special behavior | Everything else that applies: toast message (^210), cursor, hides after use (^110), snapping, and so on. |
| Tests | Where it is tested: unit (one module), integration (the editor engine with a graph, no browser), e2e (the browser). |

## Controls

Contexts are named by their mode and map state; a context is a *state* of the audit walk (below). The hint column says what the hint panel shows in that context.

| Hat | Context | Control | Operation | Hint | Visitable | Special behavior | Tests |
|-----|---------|---------|-----------|------|-----------|------------------|-------|
| ^104, ^110 | first load, or select mode after a visit (empty map) | `Tab` | Enter view mode | `Tab`: view mode, hidden for a while after the control was used (feature ^110), so after one round trip to view mode and back it is missing | n/a (a key) | the hint comes back when the visit times out | unit `hud/modes.test`, `editor/modes.test`; e2e `modes.spec` |
| ^104 | view mode | `Tab` | Back to select mode | should be `Tab`: select mode, but it is hidden after entering (bug ^384) | n/a | hidden for a while after use (^110) | e2e `modes.spec` |
| ^168, ^223 | first load, view mode (and every mode, nothing being typed) | `Ctrl+O` | Opens the projects modal and, in the same step, the file window of *Import file…*; overrides the browser's own `Ctrl+O` | none (exemption: not yet decided, ^371) | n/a | the file window is the browser's own (`<input type=file accept=".json,application/json">`, hidden, clicked by code) | e2e `projects.spec` |
| ^222 | first load, view mode | `P` | Opens the projects modal (without the file window) | `P`: projects, always shown | n/a (a key) | ignored while a text field has the focus | e2e `projects.spec` |
| ^226, ^185, ^232 | any mode, nothing saved yet | `Ctrl+S` | Nothing is saved; two info toasts: `nothing to save yet`, `modelcity saves automatically` | none (exemption: not yet decided, ^371) | n/a | toasts (^210) disappear after 3 s, an identical toast is not shown twice | unit `project/load.test`; e2e: gap ^379 |
| ^242, ^81 | any mode, nothing to undo | `Ctrl+Z`, `Alt+Ctrl+Z` | Nothing; info toast `nothing to undo` | none | n/a | toast, 3 s | e2e `editing.spec` (plain); `Alt`: gap ^380 |
| ^242, ^81 | any mode, nothing to redo | `Ctrl+Y`, `Ctrl+Shift+Z`, `Alt` variants | Nothing; info toast `nothing to redo` | none | n/a | toast, 3 s | e2e `editing.spec` (plain); `Alt`: gap ^380 |

## Walk-through (depth first)

The audit is a depth-first walk through the app, by hand, one input at a time. A *state* is named by what the user sees, never given an id (hats are the only ids). For each state: the transitions explored and those still to explore. A transition that stays in the same state is listed as "same state".

Stack (where we are, kept up to date at the end of the Journey): first load > view mode > **projects modal** (the file window is closed by Cancel; its second transition, Open file, is left for later)

### first load (select mode, empty map)

Screen: blank canvas; a blue outline around the window; four mode icons (eye, pointer in a blue ring, pen, extend); the hints `Tab` view mode, `LMB` draw mode, `LMB drag` select, `RMB drag` pan, wheel zoom, `MMB drag` rotate, `P` projects; the default cursor. Hats: ^119, ^104, ^120, ^49, ^377 (dark and light mode).

| Input | Result | Explored |
|-------|--------|----------|
| `Ctrl+S` | same state, two toasts | yes |
| `Ctrl+Z`, `Alt+Ctrl+Z` | same state, toast | yes |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Alt` variants | same state, toast | yes |
| `Tab` | view mode | yes |
| `Ctrl+O` | projects modal with the file window open | yes (same in both states) |
| `P` | projects modal, no file window: the state after *Cancel* of the file window | has to be explored again once a project exists (after the first road) |
| `LMB` click | draw mode (nothing drawn yet) | yes |
| `LMB` drag | box select (nothing to select) | not yet: explore after nodes exist, with selection |
| `RMB` drag | pan | not yet: explore after nodes exist |
| wheel | zoom | not yet: explore after nodes exist |
| `Ctrl` + wheel | faster zoom (^376) | not yet: explore with the camera |
| `MMB` drag | rotate with the compass | not yet: explore with the camera |
| touch | one finger `LMB`, two fingers the camera (^382) | no |

### select mode after a visit of view mode (empty map)

The same as first load, except that the `Tab` hint is hidden: `Tab` was used (twice), and a control that was used lately has its hint hidden for a while (^110). This is the designed behavior, like the camera controls after their first use; the hint comes back when the visit times out. It is the same mechanism as the bug ^384, where it hides the way out of view mode. Transitions (this state is reached by the journey, so it is explored from here on): `LMB` click is explored (draw mode, below); `LMB` drag (box select), the camera controls and `P` are not explored: after the first node the camera and selection will be explored in a state where they do something, and `P` has to be explored again (a project exists then). The global keys (`Ctrl+S`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+O`, `Tab`) are as in first load. Tested in general by unit `hints/usage.test`; for `Tab` itself: gap, to be checked against e2e `editing.spec` ("a used control loses its hint").

### draw mode (nothing drawn yet; entered by `LMB` on empty canvas in select mode)

Screen: the outline and the mode icons in the draw mode's color (the pen is the current mode); the cursor is a crosshair; a preview of the node a click would add follows the pointer, an arrow pointing right (the automatic heading of the first node, ^54). Hints: `LMB`: add node; `LMB` drag: add node and set heading; `Esc` or `RMB`: finish; `P`: projects. The `Tab` hint is hidden (visited, ^110). **No camera hints** although the camera works here (bug ^389). Hats: ^54, ^48, ^47, ^23, ^40, ^110.

Operations here: *enter draw mode* (from select mode, ^54), *leave draw mode* (`Esc` or `RMB`, also before a node, ^54), *add the first node of a road* (`LMB`, heading automatic), *add the first node and set its heading* (`LMB` drag, ^40).

| Input | Result | Explored |
|-------|--------|----------|
| `LMB` click | node 1 is placed; extend mode | no |
| `LMB` drag | node 1 with the dragged heading; extend mode | no |
| `Esc`, `RMB` click | back to select mode | no |
| `Tab` | view mode | same as everywhere: explored |
| `P`, `Ctrl+O` | projects modal (over draw mode) | has to be explored again once a project exists |
| `Ctrl+S` | has to be explored again once there is data to save | not yet |
| `Ctrl+Z` | has to be explored again after each operation | not yet |
| `Ctrl+Y`, `Ctrl+Shift+Z` | has to be explored again after an operation was undone | not yet |
| `RMB` drag, wheel, `Ctrl` + wheel, `MMB` drag | camera, without hints (^389) | not yet |

### view mode (empty map)

Screen: no outline; two icons (the eye now ringed, the pointer white); hints `RMB drag` pan, wheel zoom, `MMB drag` rotate, `P` projects (there is no `Tab` hint: the control counts as visited because it was just used, ^110, which is a bug, ^384); the default cursor. Hats: ^104, ^119, ^110.

| Input | Result | Explored |
|-------|--------|----------|
| `Ctrl+S` | same state, two toasts | yes |
| `Ctrl+Z`, `Alt+Ctrl+Z` | same state, toast | yes |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Alt` variants | same state, toast | yes |
| `Ctrl+O` | projects modal with the file window open | yes |
| `Tab` | select mode, but not the first-load state: the `Tab` hint (view mode) is gone, because the control was visited (^110, below) | yes |
| `P` | projects modal, no file window: the state after *Cancel* of the file window | yes, with that state |
| `RMB` drag, wheel, `Ctrl` + wheel, `MMB` drag | camera | no |
| `LMB`, `LMB` drag | probably nothing (view mode edits nothing) | no |

### file window over the projects modal (the browser's file picker, opened by `Ctrl+O` or *Import file…*)

Screen (Brave on Arch Linux): the browser's own window, set to Custom Files; the filter is `.json` (`accept=".json,application/json"`, `ProjectsModal.svelte`). It is not ours, so it has no hints and no tests of its own. Behind it the projects modal (below). Hats: ^223, ^164.

| Input | Result | Explored |
|-------|--------|----------|
| Cancel | projects modal (state below); nothing changed; the search field is focused (^178) | yes |
| Open file | import: the file is read, checked and migrated; on success a new project opens and the modal closes, otherwise an error shows (^164, ^192 to ^209) | no |

### projects modal (no file window)

Screen: the modal sits over everything with a veil of 60% of the background color (`.backdrop`, z-index 1); the map, the mode icons, the compass and the measurements panel are *grayed out only because they lie under that veil* (no code grays them on purpose); the control hints panel and the column of toasts and the recent history panel (both z-index 2) stay above it; the hints are replaced by the modal's own controls (`modalHints`, ^168). The history panel should be grayed too (^387); a modal is not yet a reusable component (^388). Layout and sizes: ^211. From left to right, top to bottom: the title `Projects`; an X (close); the search field (focused when the modal opens, also after the file window was cancelled, so the list can be searched by typing, ^178); the list (an empty one says `No project matches.`, bug ^385); the cards `Import file…`, `Export JSON`, `New project`. `New project` has a blue border because no project is open (`current`, ^171). Hints: `Esc` close always; over the search field and not focused `LMB` search; over a button `LMB` import, export JSON or new project; over the X one merged row `Esc or LMB`: close (rows with the same text become one row, keys before the mouse, `merged` in `modalHints.ts`; tested in e2e `projects.spec`, "one row for inputs that do the same").

While the modal is up only `Esc` is handled by the app (`modalKey` in `App.svelte`); every other key is left to the browser (so `Ctrl+S` may open the browser's save dialog: to check).

| Input | Result | Explored |
|-------|--------|----------|
| `Esc` | closes the modal, back to the state before | yes (batch) |
| click outside the modal | closes it (`requestClose`, ^233: not while a rename is unfinished) | yes (batch: back to the state before, no new transition) |
| click the X | closes it | yes (batch) |
| click the search field or type | the *Search* feature (below) | no |
| `Import file…` | the file window (same state as above) | yes (same state) |
| `Export JSON` | downloads the project as a file; toast (^163, ^226) | no |
| `New project` | blank project, closes the modal (^171) | no |
| `Ctrl+S`, `Tab`, `P`, `Ctrl+Z`, ... | to check what the browser does | no |

## Reusable features

A feature that appears in several states is audited once here and linked from the states that use it.

### Search (`FilterList`, `src/lib/ui/fuzzy.ts`, hat ^178)

Every list has a search field and the search is fuzzy: the characters of the query in order, ranked by how well they match. Transitions: to be walked as its own state when we get to it (typing, `Esc`, empty result text, focus rules, the hint `LMB search`).

## Journey (the user actions in order, from a new browser window on a new machine)

The record of what the audit has pressed, in sequence. `(S)` first-load state, `(V)` view mode, `(M)` projects modal over the state before, `(A)` select mode after a visit of view mode.

| # | State | Input | Result |
|---|-------|-------|--------|
| 1 | (S) | `Ctrl+S` | two info toasts |
| 2 | (S) | `Ctrl+Z` (`Alt` ignored) | toast `nothing to undo` |
| 3 | (S) | `Ctrl+Y` or `Ctrl+Shift+Z` (`Alt` ignored) | toast `nothing to redo` |
| 4 | (S) | `Tab` | (V) |
| 4a to 4c | (V) | `Ctrl+S`, `Ctrl+Z`, `Ctrl+Y` | the same toasts |
| 5 | (V) | `Ctrl+O` | file window over (M) |
| 6 | (M) | Cancel in the file window | (M), search focused |
| 7 | (M) | hover each element | the hints of the modal, one merged row over the X |
| 8 | (M) | `LMB` in the modal outside the search field, then hover the search field | `LMB: search` shows only while the field is not focused |
| 9 | (M) | `Esc` | (V) |
| 10 | (V) | `P` | (M), no file window |
| 11 | (M) | `LMB` outside the modal | (V) |
| 12 | (V) | `P` | (M) |
| 13 | (M) | `LMB` on the X | (V) |
| 14 | (V) | `Tab` | (A): the `Tab` hint is gone (^110) |
| 15 | (A) | `LMB` click on empty canvas | (D) draw mode, nothing drawn yet |

`(D)` draw mode, nothing drawn yet. Now: **(D)**. Not yet explored in (M): `New project`, `Export JSON`, search, keys while the modal is open, Open file.

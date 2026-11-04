# Controls and features (^371)

**Status: the audit is in progress.** This file was started from blank on purpose; the previous reference is in the Git history (`git show origin/main:docs/controls.md`, last version before ^371). We fill the tables below one feature at a time, together, and take over everything from the old file that is still true. Until the PR of ^370 is merged, the old file stays the current reference.

## Definitions

- **Feature:** anything the app can do or show (a mode, a snap, a rendering, a measurement, an operation). Has a hat of type `feature`, or `operation` (see `docs/hats.md`; features and operations are listed there, not here).
- **Operation** (^180): a feature the user can do (add node, move node, split a segment, merge, delete). Every operation is a feature; not every feature is an operation (a snap rule, a gizmo, a label is not).
- **Control:** one input (key, button or gesture, with its modifiers) that does something *in a given context*. Controls are contextual by design (^45), so every row names its **context**: the mode (view, select, draw, extend), what is under the pointer, and the state of the app (selection, drag, being drawn, touch).
- **Hat:** reused if the feature, control or operation already has one (^371 rule 1); registered first if not.

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
| ^104 | first load (select mode, empty map) | `Tab` | Enter view mode | `Tab`: view mode | n/a (a key) | the hint is hidden for a while after use (^110) | unit `hud/modes.test`, `editor/modes.test`; e2e `modes.spec` |
| ^104 | view mode | `Tab` | Back to select mode | `Tab`: select mode | n/a | hidden for a while after use (^110) | e2e `modes.spec` |
| ^226, ^185, ^232 | any mode, nothing saved yet | `Ctrl+S` | Nothing is saved; two info toasts: `nothing to save yet`, `modelcity saves automatically` | none (exemption: not yet decided, ^371) | n/a | toasts (^210) disappear after 3 s, an identical toast is not shown twice | unit `project/load.test`; e2e: gap ^379 |
| ^242, ^81 | any mode, nothing to undo | `Ctrl+Z`, `Alt+Ctrl+Z` | Nothing; info toast `nothing to undo` | none | n/a | toast, 3 s | e2e `editing.spec` (plain); `Alt`: gap ^380 |
| ^242, ^81 | any mode, nothing to redo | `Ctrl+Y`, `Ctrl+Shift+Z`, `Alt` variants | Nothing; info toast `nothing to redo` | none | n/a | toast, 3 s | e2e `editing.spec` (plain); `Alt`: gap ^380 |

## Walk-through (depth first)

The audit is a depth-first walk through the app, by hand, one input at a time. A *state* is named by what the user sees, never given an id (hats are the only ids). For each state: the transitions explored and those still to explore. A transition that stays in the same state is listed as "same state".

Stack (where we are): first load > **view mode**

### first load (select mode, empty map)

Screen: blank canvas; a blue outline around the window; four mode icons (eye, pointer in a blue ring, pen, extend); the hints `Tab` view mode, `LMB` draw mode, `LMB drag` select, `RMB drag` pan, wheel zoom, `MMB drag` rotate, `P` projects; the default cursor. Hats: ^119, ^104, ^120, ^49, ^377 (dark and light mode).

| Input | Result | Explored |
|-------|--------|----------|
| `Ctrl+S` | same state, two toasts | yes |
| `Ctrl+Z`, `Alt+Ctrl+Z` | same state, toast | yes |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Alt` variants | same state, toast | yes |
| `Tab` | view mode | yes |
| `Ctrl+O` | projects modal with the file window | no |
| `P` | projects modal | no |
| `LMB` click | draw mode | no |
| `LMB` drag | box select (nothing to select) | no |
| `RMB` drag | pan | no |
| wheel | zoom | no |
| `Ctrl` + wheel | faster zoom (^376) | no |
| `MMB` drag | rotate with the compass | no |
| touch | one finger `LMB`, two fingers the camera (^382) | no |

### view mode (empty map)

Screen: no outline; two icons (the eye now ringed, the pointer white); hints `RMB drag` pan, wheel zoom, `MMB drag` rotate, `P` projects (the `Tab` hint is hidden because it was just used, ^110); the default cursor. Hats: ^104, ^119, ^110.

| Input | Result | Explored |
|-------|--------|----------|
| `Ctrl+S` | same state, two toasts | yes |
| `Ctrl+Z`, `Alt+Ctrl+Z` | same state, toast | yes |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Alt` variants | same state, toast | yes |
| `Ctrl+O` | projects modal with the file window | no |
| `Tab` | select mode (first load) | no |
| `P` | projects modal | no |
| `RMB` drag, wheel, `Ctrl` + wheel, `MMB` drag | camera | no |
| `LMB`, `LMB` drag | probably nothing (view mode edits nothing) | no |

# Controls and features (^371)

**Status: the audit is in progress.** This file was started from blank on purpose; the previous reference is in the Git history (`git show origin/main:docs/controls.md`, last version before ^371). We fill the tables below one feature at a time, together, and take over everything from the old file that is still true. Until the PR of ^370 is merged, the old file stays the current reference.

## Definitions

- **Feature:** anything the app can do or show (a mode, a snap, a rendering, a measurement, an operation). Has a hat of type `feature`, or `operation` (see `docs/hats.md`; features and operations are listed there, not here).
- **Operation** (^180, ^391): something the user deliberately does that changes the map, the stored project or what is open, or writes an output (edit the map, undo, select, pan, zoom, rotate, export, save, import, create, rename, delete, switch a project). Not a mode change, not opening a modal, not hovering. Every operation is a feature; not every feature is an operation (a snap rule, a gizmo, a label is not).
- **Hats (^392):** every operation and every control has a hat for just itself. A hat that describes several things stays as the decision, and each thing gets its own hat that points to it.
- **Control** (README glossary): a user input (key or mouse, with modifiers) in a context. Controls are contextual by design (^45), so every row names its **context**: the mode (view, select, draw, extend), what is under the pointer, and the state of the app (selection, drag, being drawn, touch). The same input in two contexts is two controls.
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

## Controls by context (the user's table)

The review table of the project owner (`docs/please-remove-me.md`, removed), with the hat of each row added: `= ^N` is a control hat that already exists, `^N` a new one. Its columns: the mode or modal; what else must hold; the input; what the hint says (only if displayed); what it does; where it is displayed; whether the hint is *visitable* (hidden for 5 minutes after use, ^110; "yes, but should not be" is the user's wish, see ^756). `Ctrl+O` is an import in this table (the modal opening is a side effect), see ^758. Written in the same detail from now on.

| Hat | Mode and modal | Additional context | Input | What it says | What it does | Displayed where | Visitable |
|-----|----------------|--------------------|-------|--------------|--------------|-----------------|-----------|
| = ^450 | any mode & no modal | - | Ctrl+S | - | save immediately | nowhere | - |
| = ^454 | any mode & no modal | - | Ctrl+Z, with optional Alt | undo ([Alt] to undo batch) | no Alt: undo, with Alt: undo batch | history panel, only when there is something to undo | yes |
| = ^456 | any mode & no modal | - | Ctrl+Y or Ctrl+Shift+Z with optional Alt | redo ([Alt] to redo batch) | no Alt: redo, with Alt: redo batch | history panel, only when there is something to redo | yes |
| = ^399 | any mode or modal | - | Ctrl+O | - | import project | no | - |
| = ^400 | any mode & no modal | - | P | projects | open project modal with search focused | control hints panel, for now. will be changed with ^97 | no |
| = ^722 | any mode & no modal | always, but only one mouse button can be dragged at a time | RMB drag | pan | pan camera | control hints panel | yes |
| = ^725 | any mode & no modal | always, but only one mouse button can be dragged at a time | MMB drag | rotate | left or right: rotate camera, up or down: dolly zoom | control hints panel | yes |
| = ^723 | any mode & no modal | - | Mouse wheel | zoom | zoom | control hints panel | yes |
| = ^724 | any mode & no modal | - | Ctrl+Mouse wheel | zoom fast | stronger zoom | nowhere today, but should be in control hints panel | yes, but only after Mouse wheel zoom without Ctrl was visited, and visitation-state resets with the "normal" zoom time |
| = ^394 | select mode | - | Tab | view mode | switch to view mode | control hints panel | yes, but should not be |
| ^771 | draw mode | - | Tab | view mode | switch to view mode | control hints panel | yes, but should not be |
| ^772 | extend mode | - | Tab | view mode | switch to view mode | control hints panel | yes, but should not be |
| = ^395 | view mode | - | Tab | select mode | switch to select mode | control hints panel | yes, but should not be |
| = ^401 | project modal | - | Esc | close | close project modal | control hints panel | no |
| = ^403 | project modal | X button hovered | LMB or Esc | close | close project modal | control hints panel | no |
| = ^740 | project modal | search bar focused | (any, with exceptions) | - | types to the search | nowhere | no |
| = ^407 | project modal | search bar not focused, but hovered by mouse | LMB | search | focus search bar | control hints panel | no |
| = ^733 | project modal | project card hovered, but not any of the buttons at the right | LMB | open | open project | control hints panel | no |
| = ^734 | project modal | pen icon hovered on project card | LMB | rename | goes to project renaming | control hints panel | no |
| = ^735 | project modal | while renaming a project & checkmark icon hovered | Enter or LMB | rename | rename project | control hints panel | no |
| = ^736 | project modal | while renaming a project & checkmark icon hovered | Esc | cancel | cancel rename | control hints panel | no |
| = ^736 | project modal | while renaming a project & cancel icon hovered | Esc or LMB | cancel | cancel rename | control hints panel | no |
| ^773 | project modal | while renaming a project & cancel icon hovered | Enter | rename | rename project | control hints panel | no |
| = ^737 | project modal | bin icon hovered on project card | LMB | delete | goes to delete confirmation | control hints panel | no |
| = ^738 | project modal | while confirmation to delete a project & checkmark icon hovered | LMB | delete | delete project | control hints panel | no |
| = ^739 | project modal | while confirmation to delete a project & checkmark icon hovered | Esc | cancel | cancel project deletion | control hints panel | no |
| = ^739 | project modal | while confirmation to delete a project & cancel icon hovered | Esc or LMB | cancel | cancel rename | control hints panel | no |
| = ^404 | project modal | "Import file..." button hovered | LMB | import | import project (open file picker) | control hints panel | no |
| = ^405 | project modal | "Export JSON" button hovered | LMB | export JSON | export project (open file picker or download JSON directly, depending on browser settings) | control hints panel | no |
| = ^406 | project modal | "New project" button hovered | LMB | new project | new project or close, if the current project is none | control hints panel | no |
| = ^495 | select mode | mouse does not hover over a node or control point | LMB drag | select | set selection by box | control hints panel | yes |
| = ^685 | select mode | mouse does not hover over a node or control point & something selected | Shift+LMB drag | add to selection | add nodes in box to selection | control hints panel | yes |
| = ^684 | select mode | mouse over void & something selected | LMB or Esc | deselect all | deselect all | control hints panel | yes |
| = ^686 | select mode | mouse over node, control point or segment & something selected | Esc | deselect all | deselect all | control hints panel | yes |
| = ^687 | select mode | something selected | Del | delete selected | delete nodes | control hints panel | yes, but it shouldn't |
| = ^417 | select mode | something selected | S | pin snap suggestions | pin snap suggestions | control hints panel | no |
| = ^721 | select mode | nothing selected & some snap suggestions pinned | S | unpin all snap suggestions | pin snap suggestions | control hints panel | no |
| = ^488 | select mode | node hovered | LMB drag | move node | move nodes | control hints panel | no |
| = ^489 | select mode | node hovered | RMB (should also allow Del in the future as alternative) | delete node | delete nodes | control hints panel | no |
| = ^490 | select mode | node hovered & nothing selected | LMB | select | set selected node | control hints panel | yes |
| = ^491 | select mode | node hovered | Alt+LMB | select branch | set selected branch | control hints panel | yes |
| = ^688 | select mode | selected node hovered | Shift+LMB | deselect | toggle node selection | control hints panel | yes |
| = ^689 | select mode | selected node hovered | Alt+Shift+LMB | add branch to selection | toggle branch selection | control hints panel | yes |
| ^774 | select mode | unselected node hovered & something selected | LMB | select instead | set selected node | control hints panel | yes |

## Controls by combination (generated by running the editor)

Generated by `src/lib/testing/controlsMatrix.test.ts` (run: `CONTROLS_MATRIX_OUT=/some/dir bunx vitest run src/lib/testing/controlsMatrix.test.ts`, it writes `matrix.json` and `matrix.md`; the hats are added by hand, ^392). It drives the editor engine (no browser, **it did not look at the screen**) on the project `docs/combinations.json` over: the mode (select, draw, extend); what is under the pointer (the void, a node, the node being drawn from, a heading control point, an end radius point, the mid radius point, a bend point, a segment); the input (`LMB` click and drag, `RMB` click, `Esc`); the modifiers (none, `Alt`, `Shift`, `Ctrl`, `Alt`+`Shift`); the selection (nothing; only the hovered node; it and others; one other; others; both nodes of the hovered segment; part of it; the whole branch); segments with and without parallel ones; and, on the straight segment between the nodes 13 and 14 with their suggestions pinned, the **snapping**: not snapped; the position only (a snap line without a heading); the position and the heading (a snap line with a heading); the heading only (a heading dragged onto a suggestion). It lists what happened: the history step, the mode, the selection and the counts. Rows that do nothing and have no hint are left out; modifiers and things under the pointer that do the same are merged. `= ^N` is a control that exists already and is the same row; a new hat stands for exactly that row. The hats are not final until the PR is merged.

| Hat | Mode | Under the pointer | Additional context | Input | What it says | What it does | Displayed where | Visitable |
|-----|------|-------------------|--------------------|-------|--------------|--------------|-----------------|-----------|
| = ^393 | select | over the void | selection: nothing | LMB or Ctrl+LMB | draw mode | goes to draw mode | control hints panel | no |
| = ^684 | select | over the void | selection: something else selected | LMB or Ctrl+LMB | deselect all | step `deselect all`; the selection is cleared | control hints panel | no |
| ^779 | select | over the void | selection: nothing | Alt+LMB | - | goes to draw mode | nowhere | - |
| ^780 | select | over the void | selection: something else selected | Alt+LMB | - | step `deselect all`; the selection is cleared | nowhere | - |
| = ^495 | select | over the void, over a segment | selection: nothing | LMB drag or Ctrl+LMB drag | select | - | control hints panel | yes |
| ^781 | select | over the void | selection: something else selected | LMB drag or Ctrl+LMB drag | select | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^782 | select | over the void | selection: something else selected | Alt+LMB drag | - | step `deselect all`; the selection is cleared | nowhere | - |
| = ^685 | select | over the void | selection: something else selected | Shift+LMB drag | add to selection | - | control hints panel | yes |
| = ^686 | select | over the void, over the mid radius point, over a bend point | selection: something else selected | Esc | deselect all | step `deselect all`; the selection is cleared | control hints panel | yes |
| = ^490 | select | over a node | selection: nothing | LMB or Ctrl+LMB | select | step `select node`; the selection becomes the hovered node | control hints panel | yes |
| ^783 | select | over a node | selection: the hovered node and others | LMB or Ctrl+LMB | - | step `deselect N nodes`; the selection becomes the hovered node | nowhere | - |
| ^784 | select | over a node | selection: only one other node; other nodes, not the hovered one | LMB or Ctrl+LMB | select instead | step `select node`; the selection becomes the hovered node | control hints panel | yes |
| = ^491 | select | over a node | selection: nothing; only the hovered node | Alt+LMB | select branch | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| ^785 | select | over a node | selection: only the hovered node; no parallel segments; straight segment | Alt+LMB | select branch | step `select node`; nodes are added to the selection | control hints panel | yes |
| ^786 | select | over a node | selection: the hovered node and others; no parallel segments; straight segment | Alt+LMB | select branch | step `select node`; the selection is replaced | control hints panel | yes |
| ^787 | select | over a node | selection: only one other node; other nodes, not the hovered one; the hovered node and others | Alt+LMB | select branch | step `select N nodes`; the selection is replaced | control hints panel | yes |
| ^788 | select | over a node | selection: nothing | Shift+LMB | - | step `select node`; the selection becomes the hovered node | nowhere | - |
| = ^688 | select | over a node | selection: only the hovered node | Shift+LMB | deselect | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^789 | select | over a node | selection: the hovered node and others | Shift+LMB | deselect | step `deselect node`; nodes are removed from the selection | control hints panel | yes |
| ^790 | select | over a node | selection: only one other node; other nodes, not the hovered one | Shift+LMB | select | step `select node`; nodes are added to the selection | control hints panel | yes |
| ^791 | select | over a node | selection: nothing | Alt+Shift+LMB | - | step `select N nodes`; nodes are added to the selection | nowhere | - |
| = ^689 | select | over a node | selection: only the hovered node; the hovered node and others; no parallel segments; straight segment | Alt+Shift+LMB | add branch to selection | step `select node`; nodes are added to the selection | control hints panel | yes |
| ^792 | select | over a node | selection: only one other node; other nodes, not the hovered one; only the hovered node; the hovered node and others | Alt+Shift+LMB | add branch to selection | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| = ^488 | select | over a node | selection: nothing; only one other node; other nodes, not the hovered one; the pointer is position and heading | LMB drag | move node | step `move node`; the selection becomes the hovered node | control hints panel | no |
| ^793 | select | over a node | selection: only the hovered node; the pointer is position and heading | LMB drag | move node | step `move node` | control hints panel | no |
| ^794 | select | over a node | selection: the hovered node and others; the pointer is position and heading | LMB drag | move node | step `move N nodes` | control hints panel | no |
| ^795 | select | over a node | selection: nothing; only the hovered node; the pointer is position and heading | Alt+LMB drag | - | step `move N nodes`; nodes are added to the selection | nowhere | - |
| ^796 | select | over a node | selection: the hovered node and others; only one other node; other nodes, not the hovered one; the pointer is position and heading | Alt+LMB drag | - | step `move N nodes`; the selection is replaced | nowhere | - |
| ^797 | select | over a node | selection: nothing; the pointer is position and heading | Shift+LMB drag | - | step `move node`; the selection becomes the hovered node | nowhere | - |
| ^798 | select | over a node | selection: only the hovered node; the pointer is position and heading | Shift+LMB drag | - | step `move node` | nowhere | - |
| ^799 | select | over a node | selection: the hovered node and others; the pointer is position and heading | Shift+LMB drag | - | step `move N nodes` | nowhere | - |
| ^800 | select | over a node | selection: only one other node; other nodes, not the hovered one; the pointer is position and heading | Shift+LMB drag | - | step `move N nodes`; nodes are added to the selection | nowhere | - |
| ^801 | select | over a node | selection: nothing; only one other node; other nodes, not the hovered one; the pointer is not snapped | Ctrl+LMB drag | move node | step `move node`; the selection becomes the hovered node | control hints panel | no |
| ^802 | select | over a node | selection: only the hovered node; the pointer is not snapped | Ctrl+LMB drag | move node | step `move node` | control hints panel | no |
| ^803 | select | over a node | selection: the hovered node and others; the pointer is not snapped | Ctrl+LMB drag | move node | step `move N nodes` | control hints panel | no |
| ^804 | select | over a node | the pointer is position and heading | Alt+Shift+LMB drag | - | step `move N nodes`; nodes are added to the selection | nowhere | - |
| = ^489 | select | over a node | selection: nothing; no parallel segments; straight segment | RMB or Ctrl+RMB | delete node | step `delete node`; nodes -2, segments -1 | control hints panel | no |
| ^805 | select | over a node | selection: only the hovered node; only one other node; other nodes, not the hovered one; no parallel segments; straight segment | RMB or Ctrl+RMB | delete node | step `delete node`; the selection is cleared; nodes -2, segments -1 | control hints panel | no |
| ^806 | select | over a node | selection: the hovered node and others; no parallel segments | RMB or Ctrl+RMB | delete node | step `delete N nodes`; the selection is cleared; nodes -5, segments -4 | control hints panel | no |
| ^807 | select | over a node | selection: nothing; parallel segments | RMB or Ctrl+RMB | delete node | step `delete node`; nodes -1, segments -1 | control hints panel | no |
| ^808 | select | over a node | selection: only the hovered node; only one other node; other nodes, not the hovered one; parallel segments | RMB or Ctrl+RMB | delete node | step `delete node`; the selection is cleared; nodes -1, segments -1 | control hints panel | no |
| ^809 | select | over a node | selection: the hovered node and others; parallel segments | RMB or Ctrl+RMB | delete node | step `delete N nodes`; the selection is cleared; nodes -4, segments -3 | control hints panel | no |
| ^810 | select | over a node | selection: the hovered node and others; straight segment | RMB or Ctrl+RMB | delete node | step `delete N nodes`; the selection is cleared; nodes -5, segments -3 | control hints panel | no |
| ^811 | select | over a node | selection: nothing; no parallel segments; straight segment | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete node`; nodes -2, segments -1 | nowhere | - |
| ^812 | select | over a node | selection: only the hovered node; only one other node; other nodes, not the hovered one; no parallel segments; straight segment | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete node`; the selection is cleared; nodes -2, segments -1 | nowhere | - |
| ^813 | select | over a node | selection: the hovered node and others; no parallel segments | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete N nodes`; the selection is cleared; nodes -5, segments -4 | nowhere | - |
| ^814 | select | over a node | selection: nothing; parallel segments | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete node`; nodes -1, segments -1 | nowhere | - |
| ^815 | select | over a node | selection: only the hovered node; only one other node; other nodes, not the hovered one; parallel segments | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete node`; the selection is cleared; nodes -1, segments -1 | nowhere | - |
| ^816 | select | over a node | selection: the hovered node and others; parallel segments | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete N nodes`; the selection is cleared; nodes -4, segments -3 | nowhere | - |
| ^817 | select | over a node | selection: the hovered node and others; straight segment | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete N nodes`; the selection is cleared; nodes -5, segments -3 | nowhere | - |
| ^818 | select | over a node | selection: only the hovered node; the hovered node and others; only one other node; other nodes, not the hovered one | Esc | deselect all | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^819 | select | over a heading control point | - | LMB or Ctrl+LMB | - | step `select node`; the selection becomes the hovered node | nowhere | - |
| ^820 | select | over a heading control point | - | Alt+LMB | flip arm | step `flip arm` | control hints panel | no |
| ^821 | select | over a heading control point | - | Alt+Shift+LMB | - | step `flip arm` | nowhere | - |
| ^822 | select | over a heading control point | - | LMB drag | turn heading | step `turn heading`; the selection becomes the hovered node | control hints panel | no |
| ^823 | select | over a heading control point | - | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `turn heading` | nowhere | - |
| ^824 | select | over a heading control point | the pointer is not snapped | Ctrl+LMB drag | turn heading | step `turn heading`; the selection becomes the hovered node | control hints panel | no |
| ^825 | select | over a heading control point | selection: something else selected | Esc | deselect all | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^826 | select | over an end radius point | the pointer is position and heading | LMB drag | change radius | step `change radius` | control hints panel | no |
| ^827 | select | over an end radius point | the pointer is position and heading | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `change radius` | nowhere | - |
| ^828 | select | over an end radius point | the pointer is not snapped | Ctrl+LMB drag | change radius | step `change radius` | control hints panel | no |
| ^829 | select | over an end radius point | selection: something else selected | Esc | deselect all | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^830 | select | over the mid radius point | selection: nothing; no parallel segments; the pointer is position and heading | LMB drag | change radius | - | control hints panel | no |
| ^831 | select | over the mid radius point | the pointer is position and heading or position only | LMB drag | change radius | step `change radius` | control hints panel | no |
| ^832 | select | over the mid radius point | selection: nothing; no parallel segments; the pointer is not snapped | Ctrl+LMB drag | change radius | - | control hints panel | no |
| ^833 | select | over the mid radius point | the pointer is not snapped | Ctrl+LMB drag | change radius | step `change radius` | control hints panel | no |
| ^834 | select | over the mid radius point | the pointer is position and heading or position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `change radius` | nowhere | - |
| ^835 | select | over a bend point | the pointer is position and heading or position only | LMB drag | bend curve | step `bend curve` | control hints panel | no |
| ^836 | select | over a bend point | the pointer is position and heading or position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `bend curve` | nowhere | - |
| ^837 | select | over a bend point | the pointer is not snapped | Ctrl+LMB drag | bend curve | step `bend curve` | control hints panel | no |
| ^838 | select | over a segment | selection: nothing | LMB or Ctrl+LMB | select segment | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| ^839 | select | over a segment | selection: part of the hovered segment (one node) | LMB or Ctrl+LMB | select segment instead | step `select node`; nodes are added to the selection | control hints panel | yes |
| ^840 | select | over a segment | selection: other nodes | LMB or Ctrl+LMB | select segment instead | step `select N nodes`; the selection is replaced | control hints panel | yes |
| ^841 | select | over a segment | selection: all of the hovered branch; parallel segments | LMB or Ctrl+LMB | - | step `deselect node`; nodes are removed from the selection | nowhere | - |
| ^842 | select | over a segment | selection: nothing; part of the hovered segment (one node) | Alt+LMB | select branch | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| ^843 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch | Alt+LMB | deselect branch | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^844 | select | over a segment | selection: part of the hovered segment (one node); both nodes of the hovered segment | Alt+LMB | select branch | step `select node`; nodes are added to the selection | control hints panel | yes |
| ^845 | select | over a segment | selection: other nodes | Alt+LMB | select branch | step `select N nodes`; the selection is replaced | control hints panel | yes |
| ^846 | select | over a segment | selection: nothing | Shift+LMB or Alt+Shift+LMB | - | step `select N nodes`; nodes are added to the selection | nowhere | - |
| ^847 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch | Shift+LMB | deselect segment | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^848 | select | over a segment | selection: part of the hovered segment (one node) | Shift+LMB | add segment to selection | step `select node`; nodes are added to the selection | control hints panel | yes |
| ^849 | select | over a segment | selection: other nodes | Shift+LMB | add segment to selection | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| ^850 | select | over a segment | selection: all of the hovered branch; parallel segments | Shift+LMB | deselect segment | step `deselect N nodes`; nodes are removed from the selection | control hints panel | yes |
| ^851 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch | Alt+Shift+LMB | deselect branch | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^852 | select | over a segment | selection: part of the hovered segment (one node); both nodes of the hovered segment | Alt+Shift+LMB | add branch to selection | step `select node`; nodes are added to the selection | control hints panel | yes |
| ^853 | select | over a segment | selection: other nodes; part of the hovered segment (one node) | Alt+Shift+LMB | add branch to selection | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| ^854 | select | over a segment | selection: both nodes of the hovered segment; part of the hovered segment (one node); all of the hovered branch; other nodes; no parallel segments; parallel segments | LMB drag or Ctrl+LMB drag | select | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^855 | select | over a segment | selection: nothing; part of the hovered segment (one node); other nodes; straight segment | LMB drag or Ctrl+LMB drag | select | step `select node`; the selection becomes the hovered node | control hints panel | yes |
| ^856 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch; straight segment | LMB drag or Ctrl+LMB drag | select | step `deselect node`; the selection becomes the hovered node | control hints panel | yes |
| ^857 | select | over a segment | selection: both nodes of the hovered segment; part of the hovered segment (one node); all of the hovered branch; other nodes; no parallel segments; parallel segments | Alt+LMB drag | - | step `deselect all`; the selection is cleared | nowhere | - |
| ^858 | select | over a segment | selection: nothing; part of the hovered segment (one node); other nodes; straight segment | Alt+LMB drag | - | step `select node`; the selection becomes the hovered node | nowhere | - |
| ^859 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch; straight segment | Alt+LMB drag | - | step `deselect node`; the selection becomes the hovered node | nowhere | - |
| ^860 | select | over a segment | selection: both nodes of the hovered segment; part of the hovered segment (one node); all of the hovered branch; other nodes | Shift+LMB drag | add to selection | - | control hints panel | yes |
| ^861 | select | over a segment | selection: nothing; straight segment | Shift+LMB drag or Alt+Shift+LMB drag | - | step `select node`; the selection becomes the hovered node | nowhere | - |
| ^862 | select | over a segment | selection: part of the hovered segment (one node); other nodes; straight segment | Shift+LMB drag | add to selection | step `select node`; nodes are added to the selection | control hints panel | yes |
| ^863 | select | over a segment | selection: part of the hovered segment (one node); other nodes; straight segment | Alt+Shift+LMB drag | - | step `select node`; nodes are added to the selection | nowhere | - |
| ^864 | select | over a segment | selection: nothing; no parallel segments; straight segment | RMB or Ctrl+RMB | remove segment | step `remove segment`; nodes -2, segments -1 | control hints panel | no |
| ^865 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch; no parallel segments; straight segment | RMB or Ctrl+RMB | remove segment | step `delete N nodes`; the selection is cleared; nodes -2, segments -1 | control hints panel | no |
| ^866 | select | over a segment | selection: part of the hovered segment (one node); other nodes; no parallel segments; straight segment | RMB or Ctrl+RMB | remove segment | step `remove segment`; the selection is cleared; nodes -2, segments -1 | control hints panel | no |
| ^867 | select | over a segment | selection: nothing; parallel segments | RMB or Ctrl+RMB | remove segment | step `remove segment`; nodes -1, segments -1 | control hints panel | no |
| ^868 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch; parallel segments | RMB or Ctrl+RMB | remove segment | step `delete N nodes`; the selection is cleared; nodes -3, segments -2 | control hints panel | no |
| ^869 | select | over a segment | selection: part of the hovered segment (one node); other nodes; parallel segments | RMB or Ctrl+RMB | remove segment | step `remove segment`; the selection is cleared; nodes -1, segments -1 | control hints panel | no |
| ^870 | select | over a segment | selection: nothing; no parallel segments; straight segment | Alt+RMB | remove branch | step `remove branch`; nodes -2, segments -1 | control hints panel | no |
| ^871 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch; no parallel segments; straight segment | Alt+RMB | remove branch | step `delete N nodes`; the selection is cleared; nodes -2, segments -1 | control hints panel | no |
| ^872 | select | over a segment | selection: part of the hovered segment (one node); other nodes; no parallel segments; straight segment | Alt+RMB | remove branch | step `remove branch`; the selection is cleared; nodes -2, segments -1 | control hints panel | no |
| ^873 | select | over a segment | selection: nothing; parallel segments | Alt+RMB | remove branch | step `remove branch`; nodes -3, segments -2 | control hints panel | no |
| ^874 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch; parallel segments | Alt+RMB | remove branch | step `delete N nodes`; the selection is cleared; nodes -3, segments -2 | control hints panel | no |
| ^875 | select | over a segment | selection: part of the hovered segment (one node); other nodes; parallel segments | Alt+RMB | remove branch | step `remove branch`; the selection is cleared; nodes -3, segments -2 | control hints panel | no |
| ^876 | select | over a segment | selection: nothing; no parallel segments; straight segment | Shift+RMB | - | step `remove segment`; nodes -2, segments -1 | nowhere | - |
| ^877 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch; no parallel segments; straight segment | Shift+RMB or Alt+Shift+RMB | - | step `delete N nodes`; the selection is cleared; nodes -2, segments -1 | nowhere | - |
| ^878 | select | over a segment | selection: part of the hovered segment (one node); other nodes; no parallel segments; straight segment | Shift+RMB | - | step `remove segment`; the selection is cleared; nodes -2, segments -1 | nowhere | - |
| ^879 | select | over a segment | selection: nothing; parallel segments | Shift+RMB | - | step `remove segment`; nodes -1, segments -1 | nowhere | - |
| ^880 | select | over a segment | selection: both nodes of the hovered segment; all of the hovered branch; parallel segments | Shift+RMB or Alt+Shift+RMB | - | step `delete N nodes`; the selection is cleared; nodes -3, segments -2 | nowhere | - |
| ^881 | select | over a segment | selection: part of the hovered segment (one node); other nodes; parallel segments | Shift+RMB | - | step `remove segment`; the selection is cleared; nodes -1, segments -1 | nowhere | - |
| ^882 | select | over a segment | selection: nothing; no parallel segments; straight segment | Alt+Shift+RMB | - | step `remove branch`; nodes -2, segments -1 | nowhere | - |
| ^883 | select | over a segment | selection: part of the hovered segment (one node); other nodes; no parallel segments; straight segment | Alt+Shift+RMB | - | step `remove branch`; the selection is cleared; nodes -2, segments -1 | nowhere | - |
| ^884 | select | over a segment | selection: nothing; parallel segments | Alt+Shift+RMB | - | step `remove branch`; nodes -3, segments -2 | nowhere | - |
| ^885 | select | over a segment | selection: part of the hovered segment (one node); other nodes; parallel segments | Alt+Shift+RMB | - | step `remove branch`; the selection is cleared; nodes -3, segments -2 | nowhere | - |
| ^886 | select | over a segment | selection: both nodes of the hovered segment; part of the hovered segment (one node); all of the hovered branch; other nodes | Esc | deselect all | step `deselect all`; the selection is cleared | control hints panel | yes |
| = ^410 | draw | over the void | - | LMB or Ctrl+LMB | add node | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| ^887 | draw | over the void | - | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | nowhere | - |
| = ^411 | draw | over the void | - | LMB drag or Ctrl+LMB drag | add node and set heading | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| ^888 | draw | over the void | - | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | nowhere | - |
| ^889 | draw | over the void, over a bend point | - | RMB or Ctrl+RMB | finish | goes to select mode | control hints panel | no |
| ^890 | draw | over the void, over a bend point | - | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to select mode | nowhere | - |
| ^891 | draw | over the void, over a bend point | - | Esc | finish | goes to select mode | control hints panel | no |
| ^892 | draw | over a node | no parallel segments; straight segment; the pointer is position only | LMB | extend | step `extend road`; goes to extend mode; the selection becomes the hovered node | control hints panel | no |
| ^893 | draw | over a node | parallel segments; the pointer is position only | LMB | split | step `split road`; goes to extend mode; the selection becomes the hovered node | control hints panel | no |
| ^894 | draw | over a node | no parallel segments; straight segment; the pointer is position only | Alt+LMB | - | step `extend road`; goes to extend mode; the selection becomes the hovered node | nowhere | - |
| ^895 | draw | over a node | parallel segments; the pointer is position only | Alt+LMB | - | step `split road`; goes to extend mode; the selection becomes the hovered node | nowhere | - |
| ^896 | draw | over a node | no parallel segments; straight segment; the pointer is not snapped | Ctrl+LMB | extend | step `extend road`; goes to extend mode; the selection becomes the hovered node | control hints panel | no |
| ^897 | draw | over a node | parallel segments; the pointer is not snapped | Ctrl+LMB | split | step `split road`; goes to extend mode; the selection becomes the hovered node | control hints panel | no |
| ^898 | draw | over a node | the pointer is position and heading | LMB drag | move node | step `move node` | control hints panel | no |
| ^899 | draw | over a node | the pointer is position and heading | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `move node` | nowhere | - |
| ^900 | draw | over a node | the pointer is not snapped | Ctrl+LMB drag | move node | step `move node` | control hints panel | no |
| ^901 | draw | over a node | no parallel segments; straight segment; the pointer is position only | RMB | delete node | step `delete node`; nodes -2, segments -1 | control hints panel | no |
| ^902 | draw | over a node | parallel segments; the pointer is position only | RMB | delete node | step `delete node`; nodes -1, segments -1 | control hints panel | no |
| ^903 | draw | over a node | no parallel segments; straight segment; the pointer is position only | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete node`; nodes -2, segments -1 | nowhere | - |
| ^904 | draw | over a node | parallel segments; the pointer is position only | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete node`; nodes -1, segments -1 | nowhere | - |
| ^905 | draw | over a node | no parallel segments; straight segment; the pointer is not snapped | Ctrl+RMB | delete node | step `delete node`; nodes -2, segments -1 | control hints panel | no |
| ^906 | draw | over a node | parallel segments; the pointer is not snapped | Ctrl+RMB | delete node | step `delete node`; nodes -1, segments -1 | control hints panel | no |
| ^907 | draw | over a node, over a segment | the pointer is position only | Esc | finish | goes to select mode | control hints panel | no |
| ^908 | draw | over a node, over a segment | the pointer is not snapped | Esc | finish | goes to select mode | control hints panel | no |
| ^909 | draw | over a heading control point | - | Alt+LMB | flip arm | step `flip arm` | control hints panel | no |
| ^910 | draw | over a heading control point | - | Alt+Shift+LMB | - | step `flip arm` | nowhere | - |
| ^911 | draw | over a heading control point | - | LMB drag | turn heading | step `turn heading` | control hints panel | no |
| ^912 | draw | over a heading control point | - | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `turn heading` | nowhere | - |
| ^913 | draw | over a heading control point | the pointer is not snapped | Ctrl+LMB drag | turn heading | step `turn heading` | control hints panel | no |
| ^914 | draw | over a heading control point | - | RMB or Ctrl+RMB | finish | goes to select mode | control hints panel | no |
| ^915 | draw | over a heading control point | - | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to select mode | nowhere | - |
| ^916 | draw | over a heading control point | - | Esc | finish | goes to select mode | control hints panel | no |
| ^917 | draw | over an end radius point | the pointer is position only | LMB | split | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^918 | draw | over an end radius point | the pointer is position only | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^919 | draw | over an end radius point | the pointer is not snapped | Ctrl+LMB | split | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^920 | draw | over an end radius point | the pointer is position and heading | LMB drag | change radius | step `change radius` | control hints panel | no |
| ^921 | draw | over an end radius point | the pointer is position and heading | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `change radius` | nowhere | - |
| ^922 | draw | over an end radius point | the pointer is not snapped | Ctrl+LMB drag | change radius | step `change radius` | control hints panel | no |
| ^923 | draw | over an end radius point | the pointer is position only | RMB | finish | goes to select mode | control hints panel | no |
| ^924 | draw | over an end radius point | the pointer is position only | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to select mode | nowhere | - |
| ^925 | draw | over an end radius point | the pointer is not snapped | Ctrl+RMB | finish | goes to select mode | control hints panel | no |
| ^926 | draw | over an end radius point | the pointer is position only | Esc | finish | goes to select mode | control hints panel | no |
| ^927 | draw | over an end radius point | the pointer is not snapped | Esc | finish | goes to select mode | control hints panel | no |
| ^928 | draw | over the mid radius point | the pointer is position only | LMB | split | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^929 | draw | over the mid radius point | the pointer is position only | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^930 | draw | over the mid radius point | the pointer is not snapped | Ctrl+LMB | split | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^931 | draw | over the mid radius point | no parallel segments; the pointer is position and heading | LMB drag | change radius | - | control hints panel | no |
| ^932 | draw | over the mid radius point | parallel segments; the pointer is position only | LMB drag | change radius | step `change radius` | control hints panel | no |
| ^933 | draw | over the mid radius point | no parallel segments; the pointer is not snapped | Ctrl+LMB drag | change radius | - | control hints panel | no |
| ^934 | draw | over the mid radius point | parallel segments; the pointer is not snapped | Ctrl+LMB drag | change radius | step `change radius` | control hints panel | no |
| ^935 | draw | over the mid radius point | parallel segments; the pointer is position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `change radius` | nowhere | - |
| ^936 | draw | over the mid radius point | the pointer is position only | RMB | finish | goes to select mode | control hints panel | no |
| ^937 | draw | over the mid radius point | the pointer is position only | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to select mode | nowhere | - |
| ^938 | draw | over the mid radius point | the pointer is not snapped | Ctrl+RMB | finish | goes to select mode | control hints panel | no |
| ^939 | draw | over the mid radius point | the pointer is position only | Esc | finish | goes to select mode | control hints panel | no |
| ^940 | draw | over the mid radius point | the pointer is not snapped | Esc | finish | goes to select mode | control hints panel | no |
| ^941 | draw | over a bend point | the pointer is position and heading or position only | LMB drag | bend curve | step `bend curve` | control hints panel | no |
| ^942 | draw | over a bend point | the pointer is position and heading or position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `bend curve` | nowhere | - |
| ^943 | draw | over a bend point | the pointer is not snapped | Ctrl+LMB drag | bend curve | step `bend curve` | control hints panel | no |
| ^944 | draw | over a segment | the pointer is position only | LMB | split | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^945 | draw | over a segment | the pointer is position only | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^946 | draw | over a segment | the pointer is not snapped | Ctrl+LMB | split | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^947 | draw | over a segment | the pointer is position and heading or position only | LMB drag | insert and set heading | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^948 | draw | over a segment | the pointer is position and heading or position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^949 | draw | over a segment | the pointer is not snapped | Ctrl+LMB drag | insert and set heading | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^950 | draw | over a segment | no parallel segments; straight segment; the pointer is position only | RMB | remove segment | step `remove segment`; nodes -2, segments -1 | control hints panel | no |
| ^951 | draw | over a segment | parallel segments; the pointer is position only | RMB | remove segment | step `remove segment`; nodes -1, segments -1 | control hints panel | no |
| ^952 | draw | over a segment | no parallel segments; straight segment; the pointer is position only | Alt+RMB | remove branch | step `remove branch`; nodes -2, segments -1 | control hints panel | no |
| ^953 | draw | over a segment | parallel segments; the pointer is position only | Alt+RMB | remove branch | step `remove branch`; nodes -3, segments -2 | control hints panel | no |
| ^954 | draw | over a segment | no parallel segments; straight segment; the pointer is position only | Shift+RMB | - | step `remove segment`; nodes -2, segments -1 | nowhere | - |
| ^955 | draw | over a segment | parallel segments; the pointer is position only | Shift+RMB | - | step `remove segment`; nodes -1, segments -1 | nowhere | - |
| ^956 | draw | over a segment | no parallel segments; straight segment; the pointer is not snapped | Ctrl+RMB | remove segment | step `remove segment`; nodes -2, segments -1 | control hints panel | no |
| ^957 | draw | over a segment | parallel segments; the pointer is not snapped | Ctrl+RMB | remove segment | step `remove segment`; nodes -1, segments -1 | control hints panel | no |
| ^958 | draw | over a segment | no parallel segments; straight segment; the pointer is position only | Alt+Shift+RMB | - | step `remove branch`; nodes -2, segments -1 | nowhere | - |
| ^959 | draw | over a segment | parallel segments; the pointer is position only | Alt+Shift+RMB | - | step `remove branch`; nodes -3, segments -2 | nowhere | - |
| = ^477 | extend | over the void | the pointer is position only | LMB | add node | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^960 | extend | over the void | the pointer is position only | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `place node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^961 | extend | over the void | the pointer is not snapped | Ctrl+LMB | add node | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| = ^478 | extend | over the void | - | LMB drag or Ctrl+LMB drag | add node and set heading | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^962 | extend | over the void | - | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `place node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^963 | extend | over the void, over the mid radius point | the pointer is position only | RMB | finish | goes to draw mode | control hints panel | no |
| ^964 | extend | over the void, over the mid radius point | the pointer is position only | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to draw mode | nowhere | - |
| ^965 | extend | over the void, over the mid radius point | the pointer is not snapped | Ctrl+RMB | finish | goes to draw mode | control hints panel | no |
| ^966 | extend | over the void, over the mid radius point | the pointer is position only | Esc | finish | goes to select mode | control hints panel | no |
| ^967 | extend | over the void, over the mid radius point | the pointer is not snapped | Esc | finish | goes to select mode | control hints panel | no |
| ^968 | extend | over a node | no parallel segments; the pointer is position only | LMB | close | step `close road`; goes to draw mode; nodes 0, segments +1 | control hints panel | no |
| ^969 | extend | over a node | parallel segments; straight segment; the pointer is position only | LMB | merge | step `merge road`; goes to draw mode; nodes 0, segments +1 | control hints panel | no |
| ^970 | extend | over a node | no parallel segments; the pointer is position only | Alt+LMB | - | step `close road`; goes to draw mode; nodes 0, segments +1 | nowhere | - |
| ^971 | extend | over a node | parallel segments; straight segment; the pointer is position only | Alt+LMB | - | step `merge road`; goes to draw mode; nodes 0, segments +1 | nowhere | - |
| ^972 | extend | over a node | no parallel segments; the pointer is not snapped | Ctrl+LMB | close | step `close road`; goes to draw mode; nodes 0, segments +1 | control hints panel | no |
| ^973 | extend | over a node | parallel segments; straight segment; the pointer is not snapped | Ctrl+LMB | merge | step `merge road`; goes to draw mode; nodes 0, segments +1 | control hints panel | no |
| ^974 | extend | over a node | the pointer is position and heading or position only | LMB drag | move node | step `move node` | control hints panel | no |
| ^975 | extend | over a node | the pointer is position and heading or position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `move node` | nowhere | - |
| ^976 | extend | over a node | the pointer is not snapped | Ctrl+LMB drag | move node | step `move node` | control hints panel | no |
| ^977 | extend | over a node | no parallel segments; parallel segments; the pointer is position only | RMB | delete node | step `delete node`; nodes -1, segments -1 | control hints panel | no |
| ^978 | extend | over a node | straight segment; the pointer is position only | RMB | delete node | step `delete node`; nodes -2, segments -1 | control hints panel | no |
| ^979 | extend | over a node | no parallel segments; parallel segments; the pointer is position only | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete node`; nodes -1, segments -1 | nowhere | - |
| ^980 | extend | over a node | straight segment; the pointer is position only | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | step `delete node`; nodes -2, segments -1 | nowhere | - |
| ^981 | extend | over a node | no parallel segments; parallel segments; the pointer is not snapped | Ctrl+RMB | delete node | step `delete node`; nodes -1, segments -1 | control hints panel | no |
| ^982 | extend | over a node | straight segment; the pointer is not snapped | Ctrl+RMB | delete node | step `delete node`; nodes -2, segments -1 | control hints panel | no |
| ^983 | extend | over a node, over a segment | the pointer is position only | Esc | finish | goes to select mode | control hints panel | no |
| ^984 | extend | over a node, over a segment | the pointer is not snapped | Esc | finish | goes to select mode | control hints panel | no |
| ^985 | extend | over a heading control point | - | Alt+LMB | flip arm | step `flip arm` | control hints panel | no |
| ^986 | extend | over a heading control point | - | Alt+Shift+LMB | - | step `flip arm` | nowhere | - |
| ^987 | extend | over a heading control point | - | LMB drag | turn heading | step `turn heading` | control hints panel | no |
| ^988 | extend | over a heading control point | - | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `turn heading` | nowhere | - |
| ^989 | extend | over a heading control point | the pointer is not snapped | Ctrl+LMB drag | turn heading | step `turn heading` | control hints panel | no |
| ^990 | extend | over a heading control point | - | RMB or Ctrl+RMB | finish | goes to draw mode | control hints panel | no |
| ^991 | extend | over a heading control point | - | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to draw mode | nowhere | - |
| ^992 | extend | over a heading control point | - | Esc | finish | goes to select mode | control hints panel | no |
| ^993 | extend | over an end radius point | the pointer is position only | LMB | merge | step `merge road`; goes to draw mode; nodes +1, segments +2 | control hints panel | no |
| ^994 | extend | over an end radius point | the pointer is position only | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `merge road`; goes to draw mode; nodes +1, segments +2 | nowhere | - |
| ^995 | extend | over an end radius point | the pointer is not snapped | Ctrl+LMB | merge | step `merge road`; goes to draw mode; nodes +1, segments +2 | control hints panel | no |
| ^996 | extend | over an end radius point | the pointer is position only | LMB drag | change radius | step `change radius` | control hints panel | no |
| ^997 | extend | over an end radius point | the pointer is position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `change radius` | nowhere | - |
| ^998 | extend | over an end radius point | the pointer is not snapped | Ctrl+LMB drag | change radius | step `change radius` | control hints panel | no |
| ^999 | extend | over an end radius point | the pointer is position only | RMB | finish | goes to draw mode | control hints panel | no |
| ^1000 | extend | over an end radius point | the pointer is position only | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to draw mode | nowhere | - |
| ^1001 | extend | over an end radius point | the pointer is not snapped | Ctrl+RMB | finish | goes to draw mode | control hints panel | no |
| ^1002 | extend | over an end radius point | the pointer is position only | Esc | finish | goes to select mode | control hints panel | no |
| ^1003 | extend | over an end radius point | the pointer is not snapped | Esc | finish | goes to select mode | control hints panel | no |
| ^1004 | extend | over the mid radius point | the pointer is position only | LMB | merge | step `merge road`; goes to draw mode; nodes +1, segments +2 | control hints panel | no |
| ^1005 | extend | over the mid radius point | the pointer is position only | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `merge road`; goes to draw mode; nodes +1, segments +2 | nowhere | - |
| ^1006 | extend | over the mid radius point | the pointer is not snapped | Ctrl+LMB | merge | step `merge road`; goes to draw mode; nodes +1, segments +2 | control hints panel | no |
| ^1007 | extend | over the mid radius point | no parallel segments; the pointer is position only | LMB drag | change radius | - | control hints panel | no |
| ^1008 | extend | over the mid radius point | parallel segments; the pointer is position only | LMB drag | change radius | step `change radius` | control hints panel | no |
| ^1009 | extend | over the mid radius point | no parallel segments; the pointer is not snapped | Ctrl+LMB drag | change radius | - | control hints panel | no |
| ^1010 | extend | over the mid radius point | parallel segments; the pointer is not snapped | Ctrl+LMB drag | change radius | step `change radius` | control hints panel | no |
| ^1011 | extend | over the mid radius point | parallel segments; the pointer is position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `change radius` | nowhere | - |
| ^1012 | extend | over a bend point | the pointer is position only | LMB drag | bend curve | step `bend curve` | control hints panel | no |
| ^1013 | extend | over a bend point | the pointer is position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `bend curve` | nowhere | - |
| ^1014 | extend | over a bend point | the pointer is not snapped | Ctrl+LMB drag | bend curve | step `bend curve` | control hints panel | no |
| ^1015 | extend | over a bend point | - | RMB or Ctrl+RMB | finish | goes to draw mode | control hints panel | no |
| ^1016 | extend | over a bend point | - | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to draw mode | nowhere | - |
| ^1017 | extend | over a bend point | - | Esc | finish | goes to select mode | control hints panel | no |
| ^1018 | extend | over a segment | the pointer is position only | LMB | merge | step `merge road`; goes to draw mode; nodes +1, segments +2 | control hints panel | no |
| ^1019 | extend | over a segment | the pointer is position only | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `merge road`; goes to draw mode; nodes +1, segments +2 | nowhere | - |
| ^1020 | extend | over a segment | the pointer is not snapped | Ctrl+LMB | merge | step `merge road`; goes to draw mode; nodes +1, segments +2 | control hints panel | no |
| ^1021 | extend | over a segment | the pointer is position and heading or position only | LMB drag | insert and set heading | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^1022 | extend | over a segment | the pointer is position and heading or position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^1023 | extend | over a segment | the pointer is not snapped | Ctrl+LMB drag | insert and set heading | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^1024 | extend | over a segment | no parallel segments; parallel segments; the pointer is position only | RMB | remove segment | step `remove segment`; nodes -1, segments -1 | control hints panel | no |
| ^1025 | extend | over a segment | straight segment; the pointer is position only | RMB | remove segment | step `remove segment`; nodes -2, segments -1 | control hints panel | no |
| ^1026 | extend | over a segment | no parallel segments; the pointer is position only | Alt+RMB | remove branch | step `remove branch`; nodes -1, segments -1 | control hints panel | no |
| ^1027 | extend | over a segment | parallel segments; the pointer is position only | Alt+RMB | remove branch | step `remove branch`; nodes -3, segments -2 | control hints panel | no |
| ^1028 | extend | over a segment | straight segment; the pointer is position only | Alt+RMB | remove branch | step `remove branch`; nodes -2, segments -1 | control hints panel | no |
| ^1029 | extend | over a segment | no parallel segments; parallel segments; the pointer is position only | Shift+RMB | - | step `remove segment`; nodes -1, segments -1 | nowhere | - |
| ^1030 | extend | over a segment | straight segment; the pointer is position only | Shift+RMB | - | step `remove segment`; nodes -2, segments -1 | nowhere | - |
| ^1031 | extend | over a segment | no parallel segments; parallel segments; the pointer is not snapped | Ctrl+RMB | remove segment | step `remove segment`; nodes -1, segments -1 | control hints panel | no |
| ^1032 | extend | over a segment | straight segment; the pointer is not snapped | Ctrl+RMB | remove segment | step `remove segment`; nodes -2, segments -1 | control hints panel | no |
| ^1033 | extend | over a segment | no parallel segments; the pointer is position only | Alt+Shift+RMB | - | step `remove branch`; nodes -1, segments -1 | nowhere | - |
| ^1034 | extend | over a segment | parallel segments; the pointer is position only | Alt+Shift+RMB | - | step `remove branch`; nodes -3, segments -2 | nowhere | - |
| ^1035 | extend | over a segment | straight segment; the pointer is position only | Alt+Shift+RMB | - | step `remove branch`; nodes -2, segments -1 | nowhere | - |
| ^1036 | select | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: nothing | LMB or Ctrl+LMB | draw mode | goes to draw mode | control hints panel | no |
| ^1037 | select | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something else selected | LMB or Ctrl+LMB | deselect all | step `deselect all`; the selection is cleared | control hints panel | no |
| ^1038 | select | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: nothing | Alt+LMB | - | goes to draw mode | nowhere | - |
| ^1039 | select | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something else selected | Alt+LMB | - | step `deselect all`; the selection is cleared | nowhere | - |
| ^1040 | select | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: nothing | LMB drag or Ctrl+LMB drag | select | - | control hints panel | yes |
| ^1041 | select | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something else selected | LMB drag or Ctrl+LMB drag | select | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^1042 | select | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something else selected | Alt+LMB drag | - | step `deselect all`; the selection is cleared | nowhere | - |
| ^1043 | select | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something else selected | Shift+LMB drag | add to selection | - | control hints panel | yes |
| ^1044 | select | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something else selected | Esc | deselect all | step `deselect all`; the selection is cleared | control hints panel | yes |
| ^1045 | draw | over the void (not snapped), over the void (on a snap line without a heading) | the pointer is position only | LMB | add node | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| ^1046 | draw | over the void (not snapped), over the void (on a snap line without a heading) | the pointer is position only | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | nowhere | - |
| ^1047 | draw | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | the pointer is not snapped | Ctrl+LMB | add node | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| ^1048 | draw | over the void (not snapped) | - | LMB drag or Ctrl+LMB drag | add node and set heading | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| ^1049 | draw | over the void (not snapped) | - | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | nowhere | - |
| ^1050 | draw | over the void (not snapped), over the void (on a snap line without a heading) | the pointer is position only | RMB | finish | goes to select mode | control hints panel | no |
| ^1051 | draw | over the void (not snapped), over the void (on a snap line without a heading) | the pointer is position only | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to select mode | nowhere | - |
| ^1052 | draw | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | the pointer is not snapped | Ctrl+RMB | finish | goes to select mode | control hints panel | no |
| ^1053 | draw | over the void (not snapped), over the void (on a snap line without a heading) | the pointer is position only | Esc | finish | goes to select mode | control hints panel | no |
| ^1054 | draw | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | the pointer is not snapped | Esc | finish | goes to select mode | control hints panel | no |
| ^1055 | draw | over the void (on a snap line without a heading) | the pointer is position only | LMB drag | add node and set heading | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| ^1056 | draw | over the void (on a snap line without a heading) | the pointer is position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | nowhere | - |
| ^1057 | draw | over the void (on a snap line without a heading), over the void (on a snap line with a heading) | the pointer is not snapped | Ctrl+LMB drag | add node and set heading | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| ^1058 | draw | over the void (on a snap line with a heading) | the pointer is position and heading | LMB | add node | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| ^1059 | draw | over the void (on a snap line with a heading) | the pointer is position and heading | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | nowhere | - |
| ^1060 | draw | over the void (on a snap line with a heading) | the pointer is position and heading | LMB drag | add node and set heading | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| ^1061 | draw | over the void (on a snap line with a heading) | the pointer is position and heading | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | nowhere | - |
| ^1062 | draw | over the void (on a snap line with a heading) | the pointer is position and heading | RMB | finish | goes to select mode | control hints panel | no |
| ^1063 | draw | over the void (on a snap line with a heading) | the pointer is position and heading | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to select mode | nowhere | - |
| ^1064 | draw | over the void (on a snap line with a heading) | the pointer is position and heading | Esc | finish | goes to select mode | control hints panel | no |
| ^1065 | extend | over the void (not snapped), over the void (on a snap line without a heading) | the pointer is position only | LMB | add node | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^1066 | extend | over the void (not snapped), over the void (on a snap line without a heading) | the pointer is position only | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `place node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^1067 | extend | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | the pointer is not snapped | Ctrl+LMB | add node | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^1068 | extend | over the void (not snapped) | - | LMB drag or Ctrl+LMB drag | add node and set heading | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^1069 | extend | over the void (not snapped) | - | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `place node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^1070 | extend | over the void (not snapped), over the void (on a snap line without a heading) | the pointer is position only | RMB | finish | goes to draw mode | control hints panel | no |
| ^1071 | extend | over the void (not snapped), over the void (on a snap line without a heading) | the pointer is position only | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to draw mode | nowhere | - |
| ^1072 | extend | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | the pointer is not snapped | Ctrl+RMB | finish | goes to draw mode | control hints panel | no |
| ^1073 | extend | over the void (not snapped), over the void (on a snap line without a heading) | the pointer is position only | Esc | finish | goes to select mode | control hints panel | no |
| ^1074 | extend | over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | the pointer is not snapped | Esc | finish | goes to select mode | control hints panel | no |
| ^1075 | extend | over the void (on a snap line without a heading) | the pointer is position only | LMB drag | add node and set heading | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^1076 | extend | over the void (on a snap line without a heading) | the pointer is position only | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `place node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^1077 | extend | over the void (on a snap line without a heading), over the void (on a snap line with a heading) | the pointer is not snapped | Ctrl+LMB drag | add node and set heading | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^1078 | extend | over the void (on a snap line with a heading) | the pointer is position and heading | LMB | add node | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^1079 | extend | over the void (on a snap line with a heading) | the pointer is position and heading | Alt+LMB or Shift+LMB or Alt+Shift+LMB | - | step `place node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^1080 | extend | over the void (on a snap line with a heading) | the pointer is position and heading | LMB drag | add node and set heading | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| ^1081 | extend | over the void (on a snap line with a heading) | the pointer is position and heading | Alt+LMB drag or Shift+LMB drag or Alt+Shift+LMB drag | - | step `place node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| ^1082 | extend | over the void (on a snap line with a heading) | the pointer is position and heading | RMB | finish | goes to draw mode | control hints panel | no |
| ^1083 | extend | over the void (on a snap line with a heading) | the pointer is position and heading | Alt+RMB or Shift+RMB or Alt+Shift+RMB | - | goes to draw mode | nowhere | - |
| ^1084 | extend | over the void (on a snap line with a heading) | the pointer is position and heading | Esc | finish | goes to select mode | control hints panel | no |

## Controls

Each row is one control (^392): an input, or alternative inputs that do the same, in one context. The Hat column starts with the control's own hat. Rows for states not walked yet follow as the audit goes on.

| Hat | Context | Control | Operation or feature | Hint | Visitable | Special behavior | Tests |
|-----|---------|---------|----------------------|------|-----------|------------------|-------|
| ^393 | select mode, the void, nothing selected | `LMB` click | enter draw mode (feature ^423; not an operation) | `LMB`: draw mode | n/a | unit `editor/modes.test`; e2e `modes.spec` |
| ^394 | select mode | `Tab` | go to view mode (feature ^425) | `Tab`: view mode, hidden for a while after the control was used (^110) | n/a | after a round trip the hint is missing until the visit times out | unit `editor/modes.test` (Tab goes to view mode from every mode, and back), `hints/hints.test`; e2e `modes.spec` |
| ^395 | view mode | `Tab` | back to select mode (feature ^422) | should be `Tab`: select mode, hidden by bug ^384 | n/a | unit `editor/modes.test`, `hints/hints.test`; e2e `modes.spec` |
| ^396 | any mode, no modal, nothing to save | `Ctrl+S` | save project (operation ^428): nothing to save, toasts ^441 and ^442 (^232) | none (exemption not yet decided) | n/a | toasts 3 s, identical toast not shown twice | unit `project/load.test`; e2e: gap ^379 |
| ^397 | any mode, no modal, nothing to undo | `Ctrl+Z` | toast ^443 `nothing to undo` (^81) | none | n/a | toast 3 s | e2e `editing.spec`; `Alt` variant: gap ^380 |
| ^398 | any mode, no modal, nothing to redo | `Ctrl+Y` or `Ctrl+Shift+Z` | toast ^444 `nothing to redo` (^81) | none | n/a | toast 3 s | e2e `editing.spec`; `Alt` variant: gap ^380 |
| ^399 | any mode, no modal | `Ctrl+O` | open the projects modal (feature ^426) and the file window of import project (operation ^430) | none (exemption not yet decided) | n/a | overrides the browser's `Ctrl+O`; the file window is the browser's own | e2e `projects.spec` |
| ^400 | any mode, no modal, no text field focused | `P` | open the projects modal (feature ^426) | `P`: projects, always shown | n/a | | e2e `projects.spec` |
| ^401 | projects modal | `Esc` | close the modal (feature ^426) | `Esc`: close (merged with `LMB` over the X) | n/a | | e2e `projects.spec` |
| ^402 | projects modal, pointer outside the dialog | `LMB` click | close the modal (feature ^426; ^233: not while a rename is unfinished) | none (exemption: the backdrop is not a target) | no | | e2e `projects.spec` |
| ^403 | projects modal, pointer on the X | `LMB` click | close the modal (feature ^426) | `Esc or LMB`: close | yes (hover) | | e2e `projects.spec` |
| ^404 | projects modal, pointer on `Import file…` | `LMB` click | import project (operation ^430): open the file window | `LMB`: import | yes (hover) | | e2e `projects.spec` |
| ^405 | projects modal, pointer on `Export JSON` | `LMB` click | export project (operation ^429); to explore | `LMB`: export JSON | yes (hover) | | e2e `projects.spec` |
| ^406 | projects modal, pointer on `New project` | `LMB` click | new project (operation ^431); to explore | `LMB`: new project | yes (hover) | | e2e `projects.spec` |
| ^407 | projects modal, pointer on the search field, not focused | `LMB` click | focus the search (feature ^427, walked later) | `LMB`: search (only while not focused) | yes (hover) | the field is focused when the modal opens | e2e `projects.spec` |
| ^408 | draw mode, nothing drawn yet | `Esc` or `RMB` click | leave draw mode (features ^423, ^422) | `Esc or RMB`: finish | n/a | unit `editor/modes.test` (Esc or a right click leave draw mode before any node has been placed) |
| ^410 | draw mode, nothing drawn yet, the void | `LMB` click | place first node (operation ^409); enters extend mode (feature ^424) | `LMB`: add node (to become `place node`, ^421) | n/a | the node placed is selected; a project may be made at once, which is fine (^386 withdrawn, ^449) | unit `editor/modes.test` (the first click only enters draw mode, the second places a node), `editor/extend.test` |
| ^411 | draw mode, nothing drawn yet, the void | `LMB` drag | place first node and set its heading (op ^420); enters extend mode with the press; the release is not yet explored | before the press `LMB` drag: add node and set heading (to become `place node and set heading`, ^421); while dragging `LMB` drag: turn heading (^286) | n/a | a drag under 6 px keeps the automatic heading; the heading snaps to the compass (^315) and to steps (^457 to ^460), with the label (^316) | unit `editor/editor.test`, `editor/cancelDrag.test`; the compass and label: gap ^463; e2e `smoke.spec` |
| ^412 | extend mode, a segment exists, pointer on the start node | `LMB` click or `Esc` | finish road (operation ^432); to explore | `LMB or Esc`: finish | n/a | with only one node: to explore | e2e `smoke.spec`, `editing.spec` |
| ^413 | extend mode, pointer on a node | `LMB` drag | move node (operation ^433); to explore | `LMB` drag: move node | n/a | snapping, `Ctrl` | unit `editor/snapping.test`; e2e `snapping.spec` |
| ^414 | extend mode, pointer on a node | `RMB` click | delete node (operation ^434); to explore | `RMB`: delete node | n/a | | unit `editor/removal` tests (to check) |
| ^415 | draw or extend mode, the pointer snaps | `Ctrl` held | no snapping (^101) | `Ctrl`: no snapping, shown only while snapping | no (never hidden) | not learnable, ^110; holding it does not take effect until the pointer moves (bug ^472) | unit `editor/snapping.test` (Ctrl turns it off), `editor/snapHover.test`; e2e `snapping.spec` (a placed node snaps to the snap line, and Ctrl turns snapping off) |
| ^416 | draw or extend mode, the pointer snaps, a click would place a node | `Shift` held | the node keeps only the snap position, not its heading (^358); to explore | `Shift`: snap only the position (to be shortened, ^474), shown only then | no | not on a drag-place; no visible effect on a snap without a heading, such as an extend line, yet the hint shows (bug ^473) | unit `editor/touching.test` (keeps only the position), `editor/headingSnap.test` |
| ^417 | any mode, at least one node selected (also, by bug ^419, the start node in extend mode) | `S` | pin snap suggestions (operation ^777, feature ^258); to explore | `S`: pin snap suggestions | no (never hidden, ^258) | with nothing selected and something pinned: `S` unpins | e2e `snapping.spec` |
| ^436 | extend mode, only the first node placed, pointer on it | `LMB` click or `Esc` | cancel first node (operation ^437): the node is taken away, back to draw mode (feature ^423) | `LMB or Esc`: finish, should be `cancel` (bug ^438) | n/a | undoable: undo brings the node back at its place; `Esc` is the alternative input, not pressed yet | unit `editor/undoRedo.test` (cancelling a lone node with Esc can be undone), `editor/editor.test` (finishing a road with one node cancels it); e2e: gap |
| ^450 | any mode, no modal, a project is open (it has data) | `Ctrl+S` | save project (operation ^428) at once: toast ^440 `saved`, then toast ^442 `modelcity saves automatically` (^232) | none (exemption not yet decided) | n/a | the background: ^165 (the browser's database), ^166 autosave, ^445 (400 ms), ^446 (5 s), ^447, ^448 | unit `project/load.test` (Ctrl+S saves at once and says so); e2e `projects.spec` |
| ^454 | any mode, no modal, a step in the history to undo | `Ctrl+Z` | undo (operation ^453): the last step is taken back; here the cancel of the first node, so the node is back with its heading | the undo hint of the history panel: `Ctrl+Z`: undo (`Alt` to undo batch), shown while there is a step to undo (^109, ^241) | n/a | the undone step stays in the panel in gray, joined to its batch (^107, ^108); the `Alt` note is always shown (roadmap ^418) | unit `editor/undoRedo.test`, `editor/steps.test`, `hud/panel.test` (undone steps grayed), `hints/usage.test` (the hint is hidden when visited); e2e `editing.spec` (the recent history panel grays out undone steps) |
| ^456 | any mode, no modal, an undone step to redo | `Ctrl+Y` or `Ctrl+Shift+Z` | redo (operation ^455): the undone step is done again; here the cancel, so the node is gone and the preview is back (draw mode, nothing drawn) | the redo hint of the history panel: `Ctrl+Y` or `Ctrl+Shift+Z`: redo (`Alt` to redo batch), while there is a step to redo (^109, ^241) and the control is not hidden as visited (^110) | n/a | the redone step is white again; after a redo with nothing left to redo and both undo and redo visited, the panel shows no hints; the panel goes after about 3 s (^107) | unit `editor/undoRedo.test`, `editor/steps.test`, `hud/panel.test` (redoing colors them back in), `hints/usage.test`; e2e `editing.spec` |
| ^461 | a node is being placed and its heading dragged (the button is held) | `Esc` | cancel (feature ^295): the node is not placed, nothing is a step | `Esc`: cancel (^286) | n/a | the hints are only about the drag (^286) | unit `editor/cancelDrag.test` (a node that is placed with its heading is not placed) |
| ^462 | a node is being placed and its heading dragged | `Ctrl` held | no snapping (feature ^101): the heading follows the pointer freely, also the 45° steps | `Ctrl`: no snapping (shown for every heading drag, ^286) | no (never hidden) | not learnable, ^110 | unit `editor/editor.test` (Ctrl switches it off, ^251), `editor/snapping.test` |
| ^465 | extend mode, only the first node placed, pointer on its heading control point | `LMB` drag | turn heading (operation ^468); not pressed yet | `LMB` drag: turn heading | n/a | the heading snaps (^251, ^315); the hover ring (^469) | unit `editor/editor.test` (dragging the heading), `editor/branching.test`, `editor/headingSnap.test` |
| ^466 | extend mode, pointer on a heading control point | `Alt` + `LMB` click | flip arm (^234); not pressed yet | `Alt`+`LMB`: flip arm | n/a | a click, not a drag | unit `editor/controls.test`; e2e `editing.spec` |
| ^467 | extend mode, only the first node placed, pointer not on the start node | `Esc` or `RMB` click | cancel first node (operation ^437); not pressed yet | `Esc or RMB`: finish, should be `cancel` (bug ^438) | n/a | undoable, like ^436 | unit `editor/undoRedo.test`, `editor/editor.test` (a right click on empty space finishes the road, finishing with one node cancels it) |
| ^477 | extend mode, pointer on the void | `LMB` click | place next node (operation ^475); walked in steps 35 and 36 (press) | `LMB`: add node (to become `place node`, ^421) | n/a | the node snaps (^101); `Shift` keeps only the position (^416) | unit `editor/extend.test`, `editor/editor.test`, `editor/snapping.test` |
| ^478 | extend mode, pointer on the void | `LMB` drag | place next node and set heading (operation ^476); walked in steps 36 and 37 (not released yet) | `LMB` drag: add node and set heading (to become `place node and set heading`, ^421) | n/a | the heading snaps (^251) | unit `editor/editor.test`, `editor/touching.test` |
| ^488 | select mode, pointer on a node | `LMB` drag | move node (operation ^433); not pressed yet | `LMB` drag: move node | n/a | snapping (`Ctrl` turns it off); the nodes selected move together | unit `editor/editor.test`, `editor/branching.test`, `editor/snapping.test`; e2e `smoke.spec`, `editing.spec` |
| ^489 | select mode, pointer on a node | `RMB` click | delete node (operation ^434); not pressed yet | `RMB`: delete node | n/a | | unit `editor/controls.test`, `editor/rightClickSelected.test` |
| ^490 | select mode, pointer on a node | `LMB` click | select node (operation ^486), `select instead` with a selection; not pressed yet | `LMB`: select | n/a | hidden once visited (^110) | unit `editor/selection.test` |
| ^491 | select mode, pointer on a node | `Alt` + `LMB` click | select branch (operation ^487); not pressed yet | `Alt`+`LMB`: select branch (or deselect branch) | n/a | hidden once visited (^110); with `Alt` held the hovered branch gets its outline (^99) | unit `editor/branchSelect.test`, `editor/hoverFresh.test` |
| ^495 | select mode, the void, nothing selected | `LMB` drag | select by box (operation ^492); not pressed yet | `LMB` drag: select (hidden once visited, ^110) | n/a | the nodes inside are selected live | unit `editor/selection.test`, `editor/controls.test` |
| ^496 | draw mode, nothing drawn, pointer on a node without a segment | `LMB` click | extend road (operation ^493): the node becomes the node being drawn from; extend mode | `LMB`: split, should be `extend` (bug ^494) | n/a | the history step is `split road` (bug ^494) | gap: no test for a node without a segment |

## Controls found in the code, not walked yet (^684–^741)

Found by the sweep of the code (the hints, the key and pointer dispatch, the modal): one row per control (^392), each with its own hat and the operation or feature it triggers (`docs/features.md`). *Hint* is what the code says; it has not been checked on screen. The controls that the walk has already reached have their hats above. Tests: candidates by title and module, as in `docs/features.md`.

| Hat | Context | Control | Does (operation or feature) | Hint in the code | Tests |
|-----|---------|---------|----------------------------|------------------|-------|
| ^684 | select mode, the void, something selected | `LMB` click | deselect all (^557) | `LMB`: deselect all (^75) | unit `editor/editor.test` (strong), `editor/extend.test` (strong), `editor/modes.test` (strong) |
| ^685 | select mode, the void, something selected | `Shift` + `LMB` drag | add to selection (^682) | `Shift`+`LMB` drag: add to selection | unit `editor/selection.test` (strong), `editor/controls.test` (strong), `editor/modes.test` (strong) |
| ^686 | select mode, something selected | `Esc` | deselect all (^557) | `Esc`: deselect all (^218) | unit `editor/branchSelect.test` (weak), `editor/controls.test` (weak), `editor/editor.test` (weak) |
| ^687 | any mode, something selected | `Del` or `Backspace` | ^434 | `Del`: delete selected | unit `editor/controls.test` (weak), `editor/editor.test` (weak), `editor/modes.test` (weak) |
| ^688 | select mode, pointer on a node, something selected | `Shift` + `LMB` click | add to selection (^682); deselect (^683) | `Shift`+`LMB`: select or deselect | unit `editor/controls.test` (strong), `editor/editor.test` (strong), `editor/extend.test` (strong) |
| ^689 | select mode, pointer on a node, something selected | `Alt` + `Shift` + `LMB` click | select branch (^487); deselect (^683) | `Alt`+`Shift`+`LMB`: add branch to selection (or deselect branch) | unit `editor/branchSelect.test` (strong), `editor/editor.test` (strong), `editor/extend.test` (strong) |
| ^690 | select mode, pointer on a curve | `LMB` click | select segment (^555) | `LMB`: select segment | unit `editor/editor.test` (strong), `editor/controls.test` (strong), `editor/extend.test` (strong) |
| ^691 | select mode, pointer on a curve, something selected | `Shift` + `LMB` click | add to selection (^682); deselect (^683) | `Shift`+`LMB`: add segment to selection, or deselect segment | unit `editor/editor.test` (strong), `editor/controls.test` (strong), `editor/extend.test` (strong) |
| ^692 | select mode, pointer on a curve | `Alt` + `LMB` click | select branch (^487) | `Alt`+`LMB`: select branch (or deselect branch) | unit `editor/editor.test` (strong), `editor/extend.test` (strong), `editor/modes.test` (strong) |
| ^693 | select mode, pointer on a selected node, several selected | `LMB` drag | ^433 | `LMB` drag: move node (the group moves) | unit `editor/branching.test` (strong), `editor/controls.test` (strong), `editor/editor.test` (strong) |
| ^694 | select mode, pointer on a node | `Alt` + `LMB` drag | move branch (^681) | none (exemption not yet decided) | unit `editor/branching.test` (strong), `editor/editor.test` (strong), `editor/extend.test` (strong) |
| ^695 | any mode, pointer on a bend point | `LMB` drag | bend curve (^534) | `LMB` drag: bend curve | unit `editor/branching.test` (strong), `curves/continuity.test` (weak), `editor/editor.test` (weak) |
| ^696 | any mode, pointer on a radius point | `LMB` drag | change radius (^535) | `LMB` drag: change radius | unit `curves/continuity.test` (weak), `editor/branching.test` (weak), `editor/controlSnap.test` (weak) |
| ^697 | any mode, pointer on a corner point of an S-curve | `LMB` drag | turn heading (^468) | `LMB` drag: turn heading | unit `editor/branching.test` (strong), `editor/inflection.test` (strong), `curves/continuity.test` (weak) |
| ^698 | any mode, pointer on a radius point, a segment whose two nodes are selected | `LMB` drag | change radius (^535) | `LMB` drag: change radius (all selected segments) | unit `editor/selection.test` (strong), `editor/controlSnap.test` (strong), `editor/controls.test` (strong) |
| ^699 | any mode, several nodes selected, pointer on one of them or on a segment between them | `RMB` click | ^434 | `RMB`: delete selected (^290) | unit `editor/rightClickSelected.test` (strong), `editor/controls.test` (strong), `editor/editor.test` (strong) |
| ^700 | the heading of an existing node is dragged, it snapped to something | `Shift` held | ^335 | `Shift`: aim at snap suggestion | unit `editor/modes.test` (strong), `editor/headingSnap.test` (weak), `editor/branching.test` (weak) |
| ^701 | the heading of an existing node is dragged, it snapped to something | `Shift` + `Alt` held | ^335 | `Shift+Alt`: aim away from snap suggestion | unit `editor/headingSnap.test` (strong), `editor/modes.test` (strong), `editor/branching.test` (weak) |
| ^702 | a handle is dragged, the pointer snapped to a touching point or a heading | `Alt` held | ^301 | `Alt`: opposite heading | unit `editor/touching.test` (weak), `editor/branching.test` (weak), `editor/controlSnap.test` (weak) |
| ^703 | a node is dragged onto another node, released | `LMB` release | merge nodes by drop (^248) | `LMB`: merge on release (while dragging) | unit `editor/merging.test` (strong), `editor/ownCurve.test` (strong), `editor/dropMerge.test` (strong) |
| ^704 | a node is dragged onto a curve, released | `LMB` release | join node into a curve by drop (^680) | none (the dashed result shows, ^284) | unit `editor/ownCurve.test` (strong), `editor/branching.test` (weak), `editor/cancelDrag.test` (weak) |
| ^705 | a radius point is dragged onto a node of its segment | `LMB` release | ^141 | none | unit `editor/controlSnap.test` (strong), `curves/radiusHandles.test` (strong), `editor/ownCurve.test` (strong) |
| ^706 | draw mode, nothing drawn, pointer on another node | `LMB` click | split road (^549) | `LMB`: split | unit `editor/branching.test` (strong), `editor/extend.test` (strong), `editor/controls.test` (strong) |
| ^707 | draw mode, nothing drawn, pointer on a curve | `LMB` click | split road (^549); insert node (^10) | `LMB`: split | unit `editor/branching.test` (strong), `editor/extend.test` (strong), `editor/controls.test` (strong) |
| ^708 | draw mode, nothing drawn, pointer on a curve | `LMB` drag | insert node (^10) | `LMB` drag: insert and set heading | unit `editor/branching.test` (strong), `editor/extend.test` (strong), `editor/controls.test` (strong) |
| ^709 | draw mode, nothing drawn, pointer on a curve | `RMB` click | remove segment (^551) | `RMB`: remove segment | unit `editor/branching.test` (strong), `editor/controls.test` (strong), `editor/editor.test` (strong) |
| ^710 | draw mode, nothing drawn, pointer on a curve | `Alt` + `RMB` click | remove branch (^552) | `Alt`+`RMB`: remove branch | unit `editor/branching.test` (strong), `editor/controls.test` (strong), `editor/editor.test` (strong) |
| ^711 | draw mode, pointer on a radius point | `LMB` click | split road (^549); merge road (^550) | none (as on the curve) | unit `editor/extend.test` (strong), `editor/modes.test` (strong), `editor/branching.test` (strong) |
| ^712 | draw mode, right after a split, pointer on the inserted node | `LMB` click | ^276 | none | unit `editor/radiusClick.test` (strong), `editor/modes.test` (strong), `editor/extend.test` (strong) |
| ^713 | draw mode, right after a split on a curve, nothing placed after it | `Esc` or `RMB` click | ^237 | `Esc or RMB`: finish | unit `editor/controls.test` (strong), `editor/radiusClick.test` (strong); e2e `editing.spec` (strong) |
| ^714 | extend mode, pointer on a node of another road | `LMB` click | merge road (^550) | `LMB`: merge | unit `editor/branching.test` (strong), `editor/extend.test` (strong), `editor/editor.test` (strong) |
| ^715 | extend mode, pointer on a curve (also of the road itself) | `LMB` click | merge road (^550) | `LMB`: merge | unit `editor/branching.test` (strong), `editor/editor.test` (strong), `editor/extend.test` (strong) |
| ^716 | extend mode, pointer on the node the road started at | `LMB` click | close road (^162) | `LMB`: close | unit `editor/extend.test` (strong), `editor/branching.test` (strong), `editor/editor.test` (strong) |
| ^717 | extend mode, pointer on a curve | `LMB` drag | insert node (^10) | `LMB` drag: insert and set heading | unit `editor/branching.test` (strong), `editor/extend.test` (strong), `editor/ownCurve.test` (strong) |
| ^718 | extend mode, pointer on a curve | `RMB` click | remove segment (^551) | `RMB`: remove segment | unit `editor/editor.test` (strong), `editor/branching.test` (weak), `editor/concentricBuild.test` (weak) |
| ^719 | extend mode, pointer on a curve | `Alt` + `RMB` click | remove branch (^552) | `Alt`+`RMB`: remove branch | unit `editor/controls.test` (strong), `editor/editor.test` (strong), `editor/branchSelect.test` (weak) |
| ^720 | extend mode, a segment exists, the void | `RMB` click or `Esc` | ^432 | `Esc or RMB`: finish | unit `editor/selection.test` (strong), `hints/hints.test` (weak), `editor/controls.test` (weak) |
| ^721 | any mode, nothing selected, something pinned | `S` | unpin snap suggestions (operation ^778, feature ^258) | `S`: unpin all snap suggestions | unit `editor/pins.test` (strong), `editor/controls.test` (strong), `editor/modes.test` (strong) |
| ^722 | any mode, no modal | `RMB` drag | pan (^501) | `RMB` drag: pan (hidden after use, ^110; missing in draw mode, ^389) | unit `editor/extend.test` (weak), `editor/modes.test` (weak) |
| ^723 | any mode, no modal | wheel | zoom (^502) | wheel: zoom (hidden after use; missing in draw mode, ^389) | none found |
| ^724 | any mode, no modal | `Ctrl` + wheel (a pinch on a touchpad) | zoom (^502) | none (^376) | unit `editor/phase.test` (weak) |
| ^725 | any mode, no modal | `MMB` drag left or right | rotate (^503) | `MMB` drag: rotate (hidden after use; missing in draw mode, ^389) | unit `editor/extend.test` (weak), `editor/modes.test` (weak), `editor/radiusClick.test` (weak) |
| ^726 | any mode, no modal | `MMB` drag up or down | zoom (^502) | none (the compass shows it while dragging) | unit `editor/extend.test` (strong), `camera/camera.test` (weak), `editor/modes.test` (weak) |
| ^727 | the middle button is held (rotating) | `Esc` | ^31 | none (the compass shows the keys) | none found |
| ^728 | the middle button is held (rotating) | `N`, `E`, `S`, `W` | rotate to a direction (^504) | the compass key caps | none found |
| ^729 | the middle button is held (rotating), pointer on a compass key cap | `LMB` click | rotate to a direction (^504) | the compass key caps | unit `camera/cameraEngine.test` (weak), `editor/extend.test` (weak), `editor/modes.test` (weak) |
| ^730 | touch, one finger | touch | ^40 | none (^382) | unit `editor/editor.test` (weak) |
| ^731 | touch, a second finger comes down | touch | ^40 | none (^382) | unit `editor/editor.test` (strong), `editor/extend.test` (weak), `editor/modes.test` (weak) |
| ^732 | touch, two fingers | twist, pinch, move | pan (^501); zoom (^502); rotate (^503) | none (^382) | none found |
| ^733 | projects modal, pointer on a project card | `LMB` click | open project (^648) | `LMB`: open | unit `project/session.test` (weak), `project/load.test` (weak); e2e `projects.spec` (weak) |
| ^734 | projects modal, pointer on the pen of a card | `LMB` click | rename project (^649) | `LMB`: rename (opens a text field) | unit `project/session.test` (weak); e2e `projects.spec` (weak) |
| ^735 | projects modal, a name is being typed | `Enter` or `LMB` on the check | rename project (^649) | `Enter`/`LMB`: rename | unit `hints/hints.test` (weak) |
| ^736 | projects modal, a name is being typed | `Esc` or `LMB` on the cross | ^233 | `Esc or LMB`: cancel | unit `hints/hints.test` (weak) |
| ^737 | projects modal, pointer on the bin of a card | `LMB` click | delete project (^650) | `LMB`: delete (asks first, ^233) | unit `project/session.test` (weak); e2e `projects.spec` (weak) |
| ^738 | projects modal, a delete is being asked | `LMB` on the check | delete project (^650) | `LMB`: delete | unit `hints/hints.test` (weak) |
| ^739 | projects modal, a delete is being asked | `Esc` or `LMB` on the cross | ^233 | `Esc or LMB`: cancel | unit `hints/hints.test` (weak); e2e `projects.spec` (weak) |
| ^740 | projects modal, the search field has the focus | typing | ^427 | none (the field is the control) | none found |
| ^741 | projects modal, a rename is unfinished | `LMB` outside the dialog, `Esc`, `P` | ^233 | warning toast `Finish or cancel the rename first.` | none found |

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

### draw mode (nothing drawn yet; entered by `LMB` on the void in select mode)

Screen: the outline and the mode icons in the draw mode's color (the pen is the current mode); the cursor is a crosshair; a preview of the node a click would add follows the pointer, an arrow pointing right (the automatic heading of the first node, ^54). Hints: `LMB`: add node; `LMB` drag: add node and set heading; `Esc` or `RMB`: finish; `P`: projects. The `Tab` hint is hidden (visited, ^110). **No camera hints** although the camera works here (bug ^389). Hats: ^54, ^48, ^47, ^23, ^40, ^110.

Features here: *enter draw mode* (from select mode, ^54) and *leave draw mode* (`Esc` or `RMB`, also before a node, ^54): both are mode changes, so **not operations** (^391). Operations: *add the first node of a road* (`LMB`, heading automatic) and *add the first node and set its heading* (`LMB` drag, ^40).

| Input | Result | Explored |
|-------|--------|----------|
| `LMB` click | node 1 is placed; extend mode (below) | yes |
| `LMB` drag | node 1 with the dragged heading; extend mode | no |
| `Esc`, `RMB` click | back to select mode | no |
| `Tab` | view mode | same as everywhere: explored |
| `P`, `Ctrl+O` | projects modal (over draw mode) | has to be explored again once a project exists |
| `Ctrl+S` | has to be explored again once there is data to save | not yet |
| `Ctrl+Z` | has to be explored again after each operation | explored with the first one (^454); after later operations again |
| `Ctrl+Y`, `Ctrl+Shift+Z` | has to be explored again after an operation was undone | explored with the first one (^456); the batch variants with `Alt` after a finished road |
| `RMB` drag, wheel, `Ctrl` + wheel, `MMB` drag | camera, without hints (^389) | not yet |

### extend mode, one node placed (the pointer still on it)

Reached by `LMB` in draw mode (nothing drawn). The node is selected, the road has no segment. What the user sees, each item with where it comes from (visual details such as sizes and colors only as far as they are features):

| Item | What it is | Hats, code | Tested |
|------|------------|------------|--------|
| orange outline | extend mode's outline | ^119, ^120 (`hud/modes.ts`) | e2e `modes.spec` |
| four icons, the extend icon orange and ringed | the current mode | ^119, ^120 | unit `hud/modes.test` |
| hints `LMB or Esc`: finish; `LMB` drag: move node; `RMB`: delete node | what the pointer over a node does (the node being drawn from: finishing); controls ^412, ^413, ^414 | ^49, ^142, ^239 (`handleHints`) | unit `hints/hints.test` |
| hints `Ctrl`: no snapping; `Shift`: snap only the position | the pointer snaps (it lies on the snap lines of the node); ^415, ^416 | ^101, ^358 (`snapHints`) | unit `hints/hints.test`, `headingSnap.test` |
| hint `S`: pin snap suggestions | **bug ^419 (user)**: it shows because the start node counts as selected in extend mode, which the user never agreed to; the control itself shows while nodes are selected in every mode (^258, no mode check); control ^417 | ^258, ^294 | e2e `snapping.spec` |
| hint `P`: projects; no `Tab` hint, no camera hints | ^400; `Tab` visited (^110); camera missing (bug ^389) | | |
| history panel: `place node` with a right border | the step of operation ^409 (the step is called `place node`; the operation `place first node`), a pending batch (the drawing session is one batch until the road is finished) | ^107, ^108, ^216 (`stepNames.ts`) | e2e `editing.spec` |
| undo hint `Ctrl+Z: undo`, `(Alt to undo batch)` in gray | the undo hint in the panel; the Alt note shows always (roadmap ^418) | ^81, ^103, ^109 | unit `hints/hints.test` |
| a turquoise line from bottom to top, one from left to right, both through the node | the snap lines of the node: its normal and its heading (`nodeRules`: `node-normal`, `node-heading`). The extend lines at 15° to 75° are left out at the node itself (`withoutExtendAtTip`) | ^101, ^265 to ^267, ^325 to ^340 | unit `snap/snap.test`, `editor/snapping.test`; e2e `snapping.spec` |
| solid blue circle | the node dot: blue and larger because it is selected | ^70 (`scene.ts`, `SELECTED_DOT_PX`) | unit render tests (to check) |
| blue ring around it, with a small gap | the hover ring: the pointer is on the node; hover is derived from the pointer position | ^238 (`hover` in `editor.svelte.ts`) | unit `editor/hoverFresh.test`; e2e `editing.spec` |
| orange arrow pointing right | the heading arrow of the node (twice as long as to the control point); its heading is automatic (^54). Stronger than the preview's arrow (assumed: the preview is drawn fainter; to check) | ^9, ^126 (`drawArrow`) | none found |
| solid orange circle half way on the arrow | the heading control point on the stem (about 75% of the dot's size, not measured) | ^9, ^126 | e2e `smoke.spec` (drag) |
| cursor: a hand | the pointer is over a control point (a `grab` cursor over a handle) | ^48 | gap ^381 |

| Input | Result | Explored |
|-------|--------|----------|
| move the pointer away | the dashed preview of the next node and segment appears | no |
| `LMB` click on the void | place node 2 (the first segment) | no |
| `LMB` drag on the void | place node 2 with a heading | no |
| `LMB` click on the node | with one node only: cancel first node: draw mode again, nothing placed; history: batch `place node`, `finish road` (should be `cancel`, ^438) | yes (state below) |
| `Esc` | the same as the `LMB` click (alternative input of the same control ^436) | not pressed yet |
| `LMB` drag on the node | move node | no |
| `RMB` click on the node | delete node | no |
| `Ctrl`, `Shift` held; `S` | no snapping; position only; pin | no |
| `Tab` | view mode (a road being drawn is finished) | no |
| `P`, `Ctrl+O` | projects modal | has to be explored again (data exists) |
| `Ctrl+S`, `Ctrl+Z`, `Ctrl+Y` | to explore again: there is a step and maybe data to save | no |
| `RMB` drag, wheel, `MMB` drag | camera | not yet |

### draw mode, nothing drawn, after a cancelled first node

Like *draw mode (nothing drawn yet)* (cursor, preview with a semi-transparent preview node and the orange arrow pointing right, the same hints), but the history now holds a batch of two steps, `place node` and `finish road`, with a shared right border in the panel, and the undo hint (`Ctrl+Z`) shows below the panel (^107, ^108, ^109, ^439). The map is empty again; whether a project was made meanwhile is ^386. Hats: ^437, ^439, ^435. `Ctrl+S` is explored here (control ^450). Not yet explored here: `Ctrl+Z`, `Alt+Ctrl+Z`, `Ctrl+Y` (they have something to undo now), the camera, `P`.

### extend mode, the first node brought back by undo (E2)

Reached by `Ctrl+Z` in (D2) (control ^454). The mode and outline are those the history snapshot restores: extend mode with the node as start node again (the user did not describe the outline; to confirm). The node has its heading; the pointer lies on it, so it is hovered and the cursor is a hand (^238). History panel: `place node` in white with a white right border, `finish road` in gray with a gray right border, the two borders touching (one batch, no gap, ^108); below it the redo hint `Ctrl+Y` or `Ctrl+Shift+Z`: redo, with `(Alt to redo batch)` in gray (^109, note roadmap ^418). Hats: ^453, ^107, ^108, ^109, ^81.

| Input | Result | Explored |
|-------|--------|----------|
| `Ctrl+Y` or `Ctrl+Shift+Z` | redo: the cancel is done again (D2) | yes (control ^456; `Ctrl+Shift+Z` is its alternative, not pressed) |
| `Alt+Ctrl+Z`, `Alt+Ctrl+Y` | undo or redo of the whole batch | not yet: explore after a finished road |
| `Ctrl+Z` again | nothing to undo? (the history has two steps, one undone) | no |
| the other inputs of (E), `Ctrl+S`, `P` | as in (E) | by equivalence of the state, not pressed |

### placing the first node with its heading (the button is held)

Reached from (D2) by pressing `LMB` and moving with the button held (control ^411, operation ^420). The node is placed at the press; the road is already in extend mode, so the outline and the extend icon are orange. Screen and hints:

| Item | What it is | Hats | Tested |
|------|------------|------|--------|
| hints `LMB` drag: turn heading, `Esc`: cancel, `Ctrl`: no snapping | the hints while a handle is dragged are only about the drag (no `P`, no camera hints, no `Shift`: it is not available on a drag-place, ^358) | ^286, ^461, ^462 | unit `hints/dragHints.test` |
| the heading arrow follows the pointer in steps | the heading snaps to angle steps, finer the farther the pointer is from the node (the arrow is 80 px long): 45° up to 90 px (^457), 15° from 90 px, about 1.1 arrow lengths (^458), 5° from 180 px, about 2.25 (^459), 1° from 320 px, 4 arrow lengths (^460); for the first node of an arm the steps are absolute, from the compass directions (^315), not from the heading it had | ^251, ^315 | unit `snap/angles.test`, `editor/editor.test` |
| a compass icon and a label such as `270°` | the compass icon of the middle-button rotation (a red needle pointing north, a silver one south, a point in the middle) and the heading in degrees, 0 is north, counter-clockwise (270° is east, 315° north-east); the needle keeps pointing up while the view is not rotated; the label is below the icon, above it when the heading points down | ^316 | gap ^463 |
| cursor: a crosshair | the cursor of draw mode while a node is placed | ^48 | gap ^381 |

| Input | Result | Explored |
|-------|--------|----------|
| move the pointer | the heading follows, with the steps above | yes (to the arrow's tip: 45°; further out: 15°, 5°, 1°, observed by the user at about 1.5, 2 and 4 arrow lengths, matching 1.1, 2.25 and 4) |
| release `LMB` | the node stays with that heading (operation ^420 done); extend mode (E3, below) | yes (step 26, with the pointer on the heading control point) |
| `Esc` | cancel (control ^461): the node is not placed; back to draw mode, the preview has the default heading again (right; planned: keep it, ^464) | yes (step 24) |
| release `LMB` after that `Esc` | nothing changes (the button was still held; the pointer that goes on moving afterwards changes nothing) | yes (step 25; unit `editor/cancelDrag.test`) |
| `Ctrl` held | no snapping (control ^462) | no |
| `Alt`, `RMB`, `MMB`, the wheel | nothing known; to try | no |

### extend mode, the first node placed with a heading, pointer on its heading control point (E3)

Reached by releasing `LMB` in (P) with the pointer on the orange circle (heading 0°, up). Screen: extend mode (outline, icons); the node as a larger blue circle (it counts as selected, bug ^419); an orange arrow pointing up with the heading control point midway; a blue ring around the control point (hover ring, ^469, the pointer is on it); no compass any more (it shows only while the heading is dragged). Hints, top to bottom: `LMB` drag: turn heading (^465), `Alt`+`LMB`: flip arm (^466), `Esc` or `RMB`: finish (should be `cancel`, ^438; control ^467), `S`: pin snap suggestions (bug ^419; control ^417), `P`: projects (^400). No `Ctrl` hint, because nothing snaps under the pointer here; no `Tab` hint (visited), no camera hints (^389). History panel: the earlier batch (`place node`, `finish road`, one batch with a shared white right border) and one `place node` in white with its own border (the new drawing session is a batch of one so far, ^439). Hats: ^420, ^468, ^469, ^107, ^108.

| Input | Result | Explored |
|-------|--------|----------|
| move the pointer off the control point | the control point's ring goes; over the void the dashed preview of the next node and segment shows | no (next step) |
| `LMB` drag on the control point | turn heading (^465) | no |
| `Alt`+`LMB` click on the control point | flip arm (^466) | no |
| `Esc`, `RMB` | cancel first node (^467) | no |
| `LMB` click on the void, `LMB` drag | place next node | no |
| `Ctrl+Z` | undoes `place node`; the panel's undo hint shows | no |
| `Tab`, `P` and the others of (E) | as in (E) | no |

### extend mode, the preview of the next node (E4)

Reached from (E3) by moving the pointer off the control point onto the void. Extend mode as before (outline, icons, the cursor is a crosshair). Hints, top to bottom: `LMB`: add node (`place node`, ^421; control ^477), `LMB` drag: add node and set heading (control ^478), `Esc` or `RMB`: finish (`cancel`, ^438; control ^467), `Ctrl`: no snapping (^415), `Shift`: snap only the position (^416; to be shortened, ^474), `S`: pin snap suggestions (bug ^419; ^417), `P`: projects (^400). The `Ctrl` and `Shift` hints show only while the pointer snaps. History panel: the same three rows as before (the batch `place node`, `finish road` and the single `place node`); the undo hint has come back, because the interval of the visited control ran out (5 minutes, ^110, designed).

| Item | What it is | Hats | Tested |
|------|------------|------|--------|
| the preview node, a semi-transparent white dot under the pointer, with a semi-transparent orange arrow | the node a click would place, with its automatic heading | ^47, ^54, ^120 | unit `editor/extend.test`, `editor/editor.test`; drawing: gap ^479 |
| a white dashed curve from the start node to the preview | the segment a click would add | ^120, ^125 | gap ^479 |
| two dashed orange lines spanning the circle, the preview's arrow a continuation of the upper one | the heading lines of the two nodes, which meet at the bend point of the arc | ^321 | gap ^479 |
| an orange label of two lines, `45°` and `28.0m`, left of where the lines meet | the bend angle and the radius of the arc (`bendLines` in `render/measures.ts`); the radius is the largest that fits (auto), so the circle goes through both nodes; the bend point and the radius control points are not drawn in the preview (decision ^480) | ^303 | unit `curves/measure.test`; drawing: gap ^479 |
| an orange label `19.0m` halfway (step 27) or `21.9m` left of the dashed curve (step 28) | the length of the preview segment; its color should be that of its line (^470) | ^303, ^342 | unit `curves/measure.test`, `hud/measureText.test` |
| a turquoise line the node snaps to | step 27: the heading line of the start node (its `node-heading` rule, vertical, the pointer is on it); step 29: the extend line at +60° from the start heading (^337, only in extend mode); it lies over the preview, hiding what is below it (answered: it should lie under it, ^482) | ^101, ^265 to ^267, ^337 | unit `snap/snap.test`, `editor/ownCurve.test`, `editor/snapping.test`; e2e `snapping.spec` |
| the undo hint is back in the history panel | visited controls come back after 5 minutes (^110) | ^110, ^109 | unit `hints/usage.test` |

| Input | Result | Explored |
|-------|--------|----------|
| move the pointer onto the heading line (step 27), left of the start node (28), onto the extend line (29) | the preview, snap, labels and lines above | yes |
| `Shift` held (step 30) | no effect (the extend line has no heading to drop); the hint shows anyway (bug ^473) | yes (control ^416) |
| `Ctrl` held on its own (step 31) | nothing at once; after a small move the snap line and the `Ctrl` and `Shift` hints go (bug ^472) | yes (control ^415) |
| `Ctrl` released on its own (step 32) | nothing at once; after a small move the snap is back, as in step 29 | yes (control ^415) |
| `LMB` click | place next node (^477) | yes (step 35; the node was snapped to the extend line) |
| `LMB` drag | place next node and set heading (^478) | no |
| `Esc`, `RMB` | cancel first node (^467) | no |
| `Ctrl+Z` | undoes `place node` (the undo hint shows now) | no |

### select mode after a reload, with a lone node (R)

Reached from (E4) by reloading the page (step 33). The project that was open last opens (^485); the camera is restored, the road being drawn is not: select mode, a single node with its heading north (it was saved by the autosave, so a node without a segment survives, question ^484), no history panel (the history is not stored, ^449), no hint visits (a new session). Hints: `Tab`: view mode, `LMB`: draw mode, the camera hints, `P`: projects (control ^393 and the others of select mode, see (A)). To confirm: the list does not show `LMB` drag: select (box select, ^70), which select mode with nothing selected and the pointer on the void should show. Hats: ^485, ^449, ^484.

### select mode, the pointer on the lone node (R2)

Step 34. Hints: `LMB` drag: move node (^488), `RMB`: delete node (^489), `LMB`: select (^490), `Alt`+`LMB`: select branch (^491), the camera hints, `P`: projects. A blue ring around the node (the hover ring, ^469, the node is a control point). No history panel. To confirm: whether the `Tab` hint is still shown (the code puts it first, ^104). Tested: unit `hints/hints.test` (select mode over a handle), `editor/hoverFresh.test`.

| Input | Result | Explored |
|-------|--------|----------|
| `LMB` drag, `RMB`, `LMB`, `Alt`+`LMB` on the node | move node, delete node, select node, select branch | no (hints seen) |
| the other inputs of select mode | as in (A) | no |

### extend mode, a segment exists, the pointer on its end node (E6)

Step 35, from (R2): `LMB` on the void enters draw mode (control ^393), `LMB` on the lone node extends it (control ^496, hint `split` and step `split road`, bug ^494), the pointer is moved along the +60° extend line (^337) and `LMB` places the second node at about 30 m (control ^477, operation ^475). Extend mode (outline, icons). Hints: `Tab`: view mode (a new session, not visited), `LMB` or `Esc`: finish (control ^412, the pointer is on the node being drawn from), `LMB` drag: move node (^413), `RMB`: delete node (^414), `Ctrl` and `Shift` (while snapping, ^415, ^416), `S`: pin snap suggestions (bug ^419; ^417), `P`: projects. History panel: the undo hint (visited controls come back, a new session shows it at once) and one batch of two steps: `split road` (the click on the lone node; the user read it as `split node`, to check) and `place node`.

| Item | What it is | Hats | Tested |
|------|------------|------|--------|
| a white solid circle at the start node | the node dot of the skeleton | ^60 | gap ^479 |
| a thin white solid curve between the nodes, with four small white arrows | the curve of the segment and its direction arrows (one every 72 px) | ^60, ^80, ^86 | unit `curves/arrows.test`; drawing: gap ^479 |
| the end node larger and solid blue, a blue ring around it | the node being drawn from is drawn like a selected one (bug ^419); the ring is the hover ring (^469) | ^70, ^419, ^469 | unit `editor/hoverFresh.test` |
| a bend capsule, dark gray fill, a darker thin stroke | the generated road geometry, 3 m wide with an outline | ^90 | gap ^479 |
| a turquoise snap curve above the white curve | the curve of the segment as a snap suggestion (the pointer may snap along it, ^336, ^265 to ^273); drawn above the skeleton on purpose (^482) | ^101, ^265 to ^273, ^482 | unit `snap/snap.test`, `editor/ownCurve.test` |
| two turquoise snap lines through the end node | its heading line and its normal (`node-heading`, `node-normal`) | ^265 to ^267 | unit `snap/snap.test`, `editor/snapping.test` |

| Input | Result | Explored |
|-------|--------|----------|
| `LMB` drag on the void | place next node and set heading (^478, operation ^476) | no (next step) |
| `LMB` click on the void | place the next node (^477) | no (as in step 35, with a segment) |
| `LMB` or `Esc` | finish road (^412) | no |
| `LMB` drag on the node, `RMB` | move node, delete node | no |

### extend mode, the button held after placing a node (E7)

Step 36, from (E6): the pointer is moved to the right along the +60° line to a segment length of 34.0 m, `LMB` is pressed and held in place (the first half of control ^477 or ^478). The node is placed at the press: the generated geometry (^90) now reaches the new segment, and the new node is drawn like a selected one (the node being drawn from, bug ^419). Hints, which stay those of where the button was pressed (^499): `LMB`: add node (^477), `LMB` drag: add node and set heading (^478), `Esc` or `RMB`: finish (right here: a segment exists, so it finishes, ^432; the `cancel` of ^438 is only for a road with one node), `S`: pin snap suggestions (bug ^419), `P`: projects. To confirm: the user wrote that *all* scaffold gizmos, snap suggestions or preview are drawn; the sentence reads as if it may mean that none is. Tested: unit `editor/extend.test`, `editor/editor.test`; the held hints: to check (^499).

### extend mode, the heading of the node just placed is dragged (E8)

Step 37, from (E7): the pointer is moved a bit further to the right with the button held (control ^478, operation ^476 in progress). Hints (only about the drag, ^286): `LMB` drag: turn heading, `Esc`: cancel (control ^461), `Ctrl`: no snapping (control ^462). Canvas: the new segment has become a gentle S-curve (the heading no longer matches the single arc, ^6, ^172); an orange heading arrow; a label `45°` left of the arrow tip. The label is the offset of the heading from where it pointed when the node was placed, counter-clockwise (`turningOf`, `drawOffset`, ^341; the code writes a sign, `+45°`), not the compass of the first node (^316); the steps are 45°, 15°, 5°, 1° by distance from the node, relative to that heading (^315, ^457 to ^460). No other gizmo shows. The label is white and should be orange (^498). Tested: unit `editor/editor.test` (dragging the heading of later nodes, ^40), `curves/curves.test` (the S-curve), `hints/dragHints.test`; the label: gap ^500.

| Input | Result | Explored |
|-------|--------|----------|
| release `LMB` | the node keeps that heading; the segment is an S-curve | no |
| `Esc`, `Ctrl` held | cancel (^461), no snapping (^462) | no |
| the other inputs | as in (P) | no |

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
| 15 | (A) | `LMB` click on the void | (D) draw mode, nothing drawn yet |
| 16 | (D) | `LMB` click on the void | (E) extend mode, one node placed (operation `place first node`, ^409) |
| 17 | (E) | `LMB` click on the placed node | (D2) draw mode, nothing drawn, with a batch of two steps in the history (operation `cancel first node`, ^437) |
| 18 | (D2) | `Ctrl+S` (some seconds later) | the same state; toasts `saved` and `modelcity saves automatically` (^440, ^442) appear at once and go after 3 s; the history panel went away after about 3 s (^107); the project is saved (operation ^428, control ^450) |
| 19 | (D2) | `Ctrl+Z` (pointer still where the node was) | (E2) the node is back with its heading (operation `undo`, ^453, control ^454) |
| 20 | (E2) | `Ctrl+Y` | (D2) again: draw mode, nothing drawn, the preview is back; the history shows both steps white; no hints in the panel because `undo` and `redo` were just used (^110); the panel goes after about 3 s (operation `redo`, ^455, control ^456) |
| 21 | (D2) | `LMB` pressed and held, the pointer moved right to the tip of the heading arrow | (P) placing the first node with its heading: extend mode, hints of the drag, compass icon and the label `270°` (control ^411) |
| 22 | (P) | the pointer moved up and a little left, staying on the tip | the arrow moves in 45° steps; after one step `315°` |
| 23 | (P) | the pointer moved farther out: 1.5, 2, then 4 arrow lengths | steps of 15°, 5°, then 1° (^458 to ^460) |
| 24 | (P) | `Esc` | (D2): back to draw mode with a preview node; the preview heading is the default again (right); the placing is cancelled (control ^461) |
| 25 | (D2) | release `LMB` (still held) | nothing changes |
| 26 | (D2) | `LMB` pressed again, dragged up to the orange circle (half an arrow length, `0°`), released | (E3) extend mode, the node placed with its heading up (operation ^420 done, control ^411) |
| 27 | (E3) | the pointer moved up by 1.5 arrow lengths | (E4) the preview; the node snaps to the heading line of the start node; label `19.0m` |
| 28 | (E4) | the pointer moved about one arrow length to the left | the dashed curve and heading lines, labels `45°`, `28.0m` and `21.9m`; no snap, so no `Ctrl` or `Shift` hint |
| 29 | (E4) | the pointer moved a little further left | the node snaps to the extend line at +60° (^337) |
| 30 | (E4) | `Shift` held | no effect (^473) |
| 31 | (E4) | `Ctrl` held | no effect until the pointer moves, then the snap and its hints go (^472) |
| 32 | (E4) | `Ctrl` released | no effect until the pointer moves, then the snap is back |
| 33 | (E4) | reload the page | (R) select mode, the lone node north, no history (^485, ^484) |
| 34 | (R) | the pointer on the lone node | (R2) hover ring and the hints of a node in select mode (^488 to ^491) |
| 35 | (R2) | `LMB` on the void, `LMB` on the lone node, the pointer moved along the +60° extend line, `LMB` at about 30 m | (D) draw mode, then (E5) extend mode on the lone node (controls ^393, ^496), then (E6) extend mode with a segment (control ^477) |
| 36 | (E6) | the pointer moved right along the +60° line to a segment of 34.0 m, `LMB` pressed and held | (E7) the second node is placed, the hints stay those of the press (^499) |
| 37 | (E7) | the pointer moved a bit further right, the button still held | (E8) dragging the heading of the new node: hints of the drag, an S-curve, the label `45°` (^341, ^498) |

`(D)` draw mode, nothing drawn yet; `(E)` extend mode, one node placed; `(D2)` draw mode after a cancelled first node; `(E2)` the node brought back by undo. Now: **(E8)** (the button is held, the heading of the second node is dragged). Before: (D2) (as before, except that `undo` and `redo` count as visited, so the history panel shows no hints). Not yet explored in (M): `New project`, `Export JSON`, search, keys while the modal is open, Open file.

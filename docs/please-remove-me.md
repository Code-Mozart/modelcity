this file lists all controls by context. see the review comment i left under "## Part 4: the controls found in the code (not walked)" in `docs/audit-review.md`. you can ignore empty rows, they are meant as separators.

document with the same pedantic level of detail as this table in the future.

| Context: Mode and modal | Additional context                                                      | Input                                                    | What it says (only if displayed) | What it does                                                                               | Is displayed where?                                    | Is visitable (only if displayed)?                                                                                      |
| ----------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| any mode & no modal     | -                                                                       | Ctrl+S                                                   | -                                | save immediately                                                                           | nowhere                                                | -                                                                                                                      |
| any mode & no modal     | -                                                                       | Ctrl+Z, with optional Alt                                | undo ([Alt] to undo batch)       | no Alt: undo, with Alt: undo batch                                                         | history panel, only when there is something to undo   | yes                                                                                                                    |
| any mode & no modal     | -                                                                       | Ctrl+Y or Ctrl+Shift+Z with optional Alt                 | redo ([Alt] to redo batch)       | no Alt: redo, with Alt: redo batch                                                         | history panel, only when there is something to redo   | yes                                                                                                                    |
| any mode or modal       | -                                                                       | Ctrl+O                                                   | -                                | import project                                                                             | no                                                     | -                                                                                                                      |
| any mode & no modal     | -                                                                       | P                                                        | projects                         | open project modal with search focused                                                     | control hints panel, for now. will be changed with ^97 | no                                                                                                                     |
|                         |                                                                         |                                                          |                                  |                                                                                            |                                                        |                                                                                                                        |
| any mode & no modal     | always, but only one mouse button can be dragged at a time              | RMB drag                                                 | pan                              | pan camera                                                                                 | control hints panel                                    | yes                                                                                                                    |
| any mode & no modal     | always, but only one mouse button can be dragged at a time              | MMB drag                                                 | rotate                           | left or right: rotate camera, up or down: dolly zoom                                     | control hints panel                                    | yes                                                                                                                    |
| any mode & no modal     | -                                                                       | Mouse wheel                                              | zoom                             | zoom                                                                                       | control hints panel                                    | yes                                                                                                                    |
| any mode & no modal     | -                                                                       | Ctrl+Mouse wheel                                         | zoom fast                        | stronger zoom                                                                              | nowhere today, but should be in control hints panel    | yes, but only after Mouse wheel zoom without Ctrl was visited, and visitation-state resets with the "normal" zoom time |
|                         |                                                                         |                                                          |                                  |                                                                                            |                                                        |                                                                                                                        |
| select mode             | -                                                                       | Tab                                                      | view mode                        | switch to view mode                                                                        | control hints panel                                    | yes, but should not be                                                                                                 |
| draw mode               | -                                                                       | Tab                                                      | view mode                        | switch to view mode                                                                        | control hints panel                                    | yes, but should not be                                                                                                 |
| extend mode            | -                                                                       | Tab                                                      | view mode                        | switch to view mode                                                                        | control hints panel                                    | yes, but should not be                                                                                                 |
| view mode               | -                                                                       | Tab                                                      | select mode                      | switch to select mode                                                                      | control hints panel                                    | yes, but should not be                                                                                                 |
|                         |                                                                         |                                                          |                                  |                                                                                            |                                                        |                                                                                                                        |
| project modal           | -                                                                       | Esc                                                      | close                            | close project modal                                                                        | control hints panel                                    | no                                                                                                                     |
| project modal           | X button hovered                                                        | LMB or Esc                                               | close                            | close project modal                                                                        | control hints panel                                    | no                                                                                                                     |
| project modal           | search bar focused                                                      | (any, with exceptions)                                   | -                                | types to the search                                                                        | nowhere                                                | no                                                                                                                     |
| project modal           | search bar not focused, but hovered by mouse                            | LMB                                                      | search                           | focus search bar                                                                           | control hints panel                                    | no                                                                                                                     |
| project modal           | project card hovered, but not any of the buttons at the right           | LMB                                                      | open                             | open project                                                                               | control hints panel                                    | no                                                                                                                     |
| project modal           | pen icon hovered on project card                                        | LMB                                                      | rename                           | goes to project renaming                                                                   | control hints panel                                    | no                                                                                                                     |
| project modal           | while renaming a project & checkmark icon hovered                       | Enter or LMB                                             | rename                           | rename project                                                                             | control hints panel                                    | no                                                                                                                     |
| project modal           | while renaming a project & checkmark icon hovered                       | Esc                                                      | cancel                           | cancel rename                                                                              | control hints panel                                    | no                                                                                                                     |
| project modal           | while renaming a project & cancel icon hovered                          | Esc or LMB                                               | cancel                           | cancel rename                                                                              | control hints panel                                    | no                                                                                                                     |
| project modal           | while renaming a project & cancel icon hovered                          | Enter                                                    | rename                           | rename project                                                                             | control hints panel                                    | no                                                                                                                     |
| project modal           | bin icon hovered on project card                                        | LMB                                                      | delete                           | goes to delete confirmation                                                                | control hints panel                                    | no                                                                                                                     |
| project modal           | while confirmation to delete a project & checkmark icon hovered         | LMB                                                      | delete                           | delete project                                                                             | control hints panel                                    | no                                                                                                                     |
| project modal           | while confirmation to delete a project & checkmark icon hovered         | Esc                                                      | cancel                           | cancel project deletion                                                                    | control hints panel                                    | no                                                                                                                     |
| project modal           | while confirmation to delete a project & cancel icon hovered            | Esc or LMB                                               | cancel                           | cancel rename                                                                              | control hints panel                                    | no                                                                                                                     |
| project modal           | "Import file..." button hovered                                        | LMB                                                      | import                           | import project (open file picker)                                                          | control hints panel                                    | no                                                                                                                     |
| project modal           | "Export JSON" button hovered                                           | LMB                                                      | export JSON                      | export project (open file picker or download JSON directly, depending on browser settings) | control hints panel                                    | no                                                                                                                     |
| project modal           | "New project" button hovered                                           | LMB                                                      | new project                      | new project or close, if the current project is none                                       | control hints panel                                    | no                                                                                                                     |
|                         |                                                                         |                                                          |                                  |                                                                                            |                                                        |                                                                                                                        |
| select mode             | mouse does not hover over a node or control point                       | LMB drag                                                 | select                           | set selection by box                                                                       | control hints panel                                    | yes                                                                                                                    |
| select mode             | mouse does not hover over a node or control point & something selected | Shift+LMB drag                                           | add to selection                 | add nodes in box to selection                                                              | control hints panel                                    | yes                                                                                                                    |
| select mode             | mouse over void & something selected                                    | LMB or Esc                                               | deselect all                     | deselect all                                                                               | control hints panel                                    | yes                                                                                                                    |
| select mode             | mouse over node, control point or segment & something selected          | Esc                                                      | deselect all                     | deselect all                                                                               | control hints panel                                    | yes                                                                                                                    |
| select mode             | something selected                                                      | Del                                                      | delete selected                  | delete nodes                                                                               | control hints panel                                    | yes, but it shouldn't                                                                                                  |
| select mode             | something selected                                                      | S                                                        | pin snap suggestions             | pin snap suggestions                                                                       | control hints panel                                    | no                                                                                                                     |
| select mode             | nothing selected & some snap suggestions pinned                         | S                                                        | unpin all snap suggestions       | pin snap suggestions                                                                       | control hints panel                                    | no                                                                                                                     |
| select mode             | node hovered                                                            | LMB drag                                                 | move node                        | move nodes                                                                                 | control hints panel                                    | no                                                                                                                     |
| select mode             | node hovered                                                            | RMB (should also allow Del in the future as alternative) | delete node                      | delete nodes                                                                               | control hints panel                                    | no                                                                                                                     |
| select mode             | node hovered & nothing selected                                         | LMB                                                      | select                           | set selected node                                                                          | control hints panel                                    | yes                                                                                                                    |
| select mode             | node hovered                                                            | Alt+LMB                                                  | select branch                    | set selected branch                                                                        | control hints panel                                    | yes                                                                                                                    |
| select mode             | selected node hovered                                                   | Shift+LMB                                                | deselect                         | toggle node selection                                                                      | control hints panel                                    | yes                                                                                                                    |
| select mode             | selected node hovered                                                   | Alt+Shift+LMB                                            | add branch to selection          | toggle branch selection                                                                    | control hints panel                                    | yes                                                                                                                    |
| select mode             | unselected node hovered & something selected                            | LMB                                                      | select instead                   | set selected node                                                                          | control hints panel                                    | yes                                                                                                                    |
| ...                     | ...                                                                     | ...                                                      | ...                              | ...                                                                                        | ...                                                    | ...                                                                                                                    |

please complete this list from here with the same thoroughness. Try to account for all the combinations, i.e.:

1. mode:

   1. select mode
   2. draw mode
   3. extend mode
2. button:

   * LMB
   * RMB
   * Esc
3. manner:

   * hover
   * drag
   * click
4. modifiers

   * no modifier
   * Alt
   * Shift
   * Ctrl
   * Alt+Shift
5. snapping

   1. not snapped
   2. only position snapped
   3. only heading snapped
   4. both snapped
6. what is under the cursor/hovered

   1. void/nothing
   2. node
   3. heading control point
   4. end radius control point
   5. mid radius control point
   6. bend point
   7. segment
7. (only in select mode) what is currently selected:

   * nothing
   * only the hovered node
   * the hovered nodes and other nodes
   * only one other node
   * other nodes but not the one hovered
   * the hovered segment
   * part of the hovered segment
   * all of the hovered branch
8. parallel segments:

   * no parallel segments
   * the hovered node or segment has parallel segments

use this project:

```JSON
{
  "version": 1,
  "title": "combinations",
  "createdAt": "2026-11-05T05:38:05.934Z",
  "lastUpdatedAt": "2026-11-05T05:39:22.601Z",
  "camera": {
    "x": 30927,
    "y": -11763,
    "scale": 9.838412444627785,
    "rotation": 0
  },
  "nodes": [
    [0, -32796, -11037, -0.6981317007977318],
    [1, 5083, -23421, 0.17453292519943295],
    [2, -15297, 16244, 0.17453292519943295],
    [3, 35111, 3861, -0.6563187526384513],
    [4, 86684, -12165, 0.05375260470390486],
    [5, 44175, -18134, -1.7035163038350558],
    [6, 40819, -43268, -1.7035163038351455],
    [8, 36942, 6238, -0.6563187526384513],
    [9, 86523, -9169, 0.05375260470390486],
    [10, -15818, 19198, 0.17453292519943295]
  ],
  "edges": [
    [0, 0, 1, null, 1],
    [1, 2, 3, null, 1],
    [2, 3, 4, null, 1],
    [3, 3, 5, null, 1],
    [4, 5, 6, null, 1],
    [6, 8, 9, 74678, 1],
    [7, 10, 8, 67307, 1]
  ],
  "laneConfigurations": {
    "1": {
      "name": "default",
      "width": 3000
    }
  }
}
```

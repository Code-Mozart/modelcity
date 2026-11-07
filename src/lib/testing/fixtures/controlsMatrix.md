| Mode | Under the pointer | Additional context | Input | What it says | What it does | Displayed where | Visitable |
|------|-------------------|--------------------|-------|--------------|--------------|-----------------|-----------|
| select | over a bend point | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `bend curve` | nowhere | - |
| select | over a bend point | - | Ctrl+LMB drag or LMB drag | bend curve | step `bend curve` | control hints panel | no |
| select | over a heading control point | - | Alt+LMB | flip arm | step `flip arm` | control hints panel | no |
| select | over a heading control point | - | Alt+Shift+LMB | - | step `flip arm` | nowhere | - |
| select | over a heading control point | - | Ctrl+LMB or LMB | - | step `select node`; the selection becomes the hovered node | nowhere | - |
| select | over a heading control point | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `turn heading` | nowhere | - |
| select | over a heading control point | - | Ctrl+LMB drag or LMB drag | turn heading | step `turn heading`; the selection becomes the hovered node | control hints panel | no |
| select | over a node | selection: only the hovered node; parallel segments | Alt+LMB | select branch | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| select | over a node, over a segment | selection: nothing | Alt+LMB | select branch | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| select | over a node | selection: only the hovered node; no parallel segments; straight segment | Alt+LMB | select branch | step `select node`; nodes are added to the selection | control hints panel | yes |
| select | over a node | selection: the hovered node and others; no parallel segments; straight segment | Alt+LMB | select branch | step `select node`; the selection is replaced | control hints panel | yes |
| select | over a node | selection: only one other node; straight segment | Alt+LMB | select branch | step `select N nodes`; the selection is replaced | control hints panel | yes |
| select | over a node | selection: only one other node; other nodes, not the hovered one; no parallel segments | Alt+LMB | select branch | step `select N nodes`; the selection is replaced | control hints panel | yes |
| select | over a node | selection: only one other node; the hovered node and others; parallel segments | Alt+LMB | select branch | step `select N nodes`; the selection is replaced | control hints panel | yes |
| select | over a node | selection: other nodes, not the hovered one; parallel segments; straight segment | Alt+LMB | select branch | step `select N nodes`; the selection is replaced | control hints panel | yes |
| select | over a node | selection: nothing | Alt+Shift+LMB | - | step `select N nodes`; nodes are added to the selection | nowhere | - |
| select | over a node | selection: only the hovered node; the hovered node and others; no parallel segments; straight segment | Alt+Shift+LMB | add branch to selection | step `select node`; nodes are added to the selection | control hints panel | yes |
| select | over a node | selection: only the hovered node; the hovered node and others; parallel segments | Alt+Shift+LMB | add branch to selection | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| select | over a node | selection: only one other node; other nodes, not the hovered one | Alt+Shift+LMB | add branch to selection | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| select | over a node | selection: nothing | Ctrl+LMB or LMB | select | step `select node`; the selection becomes the hovered node | control hints panel | yes |
| select | over a node | selection: the hovered node and others | Ctrl+LMB or LMB | select instead | step `deselect N nodes`; the selection becomes the hovered node | control hints panel | yes |
| select | over a node | selection: only one other node; other nodes, not the hovered one | Ctrl+LMB or LMB | select instead | step `select node`; the selection becomes the hovered node | control hints panel | yes |
| select | over a node | selection: nothing | Shift+LMB | - | step `select node`; the selection becomes the hovered node | nowhere | - |
| select | over a node | selection: only the hovered node | Shift+LMB | deselect | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a node | selection: the hovered node and others | Shift+LMB | deselect | step `deselect node`; nodes are removed from the selection | control hints panel | yes |
| select | over a node | selection: only one other node; other nodes, not the hovered one | Shift+LMB | select | step `select node`; nodes are added to the selection | control hints panel | yes |
| select | over a node | selection: only one other node; other nodes, not the hovered one; the hovered node and others | Alt+LMB drag | - | step `move N nodes`; the selection is replaced | nowhere | - |
| select | over a node | selection: nothing; only the hovered node | Alt+LMB drag or Alt+Shift+LMB drag | - | step `move N nodes`; nodes are added to the selection | nowhere | - |
| select | over a node | - | Alt+Shift+LMB drag | - | step `move N nodes`; nodes are added to the selection | nowhere | - |
| select | over a node | selection: only one other node; other nodes, not the hovered one | Alt+Shift+LMB drag or Shift+LMB drag | - | step `move N nodes`; nodes are added to the selection | nowhere | - |
| select | over a node | selection: nothing; only one other node; other nodes, not the hovered one | Ctrl+LMB drag or LMB drag | move node | step `move node`; the selection becomes the hovered node | control hints panel | no |
| select | over a node | selection: only the hovered node | Ctrl+LMB drag or LMB drag | move node | step `move node` | control hints panel | no |
| select | over a node | selection: the hovered node and others | Ctrl+LMB drag or LMB drag | move node | step `move N nodes` | control hints panel | no |
| select | over a node | selection: nothing | Shift+LMB drag | - | step `move node`; the selection becomes the hovered node | nowhere | - |
| select | over a node | selection: only the hovered node | Shift+LMB drag | - | step `move node` | nowhere | - |
| select | over a node | selection: the hovered node and others | Shift+LMB drag | - | step `move N nodes` | nowhere | - |
| select | over a node | selection: nothing; no parallel segments; straight segment | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete node`; nodes -2, segments -1 | nowhere | - |
| select | over a node | selection: only one other node; only the hovered node; other nodes, not the hovered one; no parallel segments; straight segment | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete node`; the selection is cleared; nodes -2, segments -1 | nowhere | - |
| select | over a node | selection: the hovered node and others; no parallel segments | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete N nodes`; the selection is cleared; nodes -5, segments -4 | nowhere | - |
| select | over a node | selection: nothing; parallel segments | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete node`; nodes -1, segments -1 | nowhere | - |
| select | over a node | selection: only one other node; only the hovered node; other nodes, not the hovered one; parallel segments | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete node`; the selection is cleared; nodes -1, segments -1 | nowhere | - |
| select | over a node | selection: the hovered node and others; parallel segments | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete N nodes`; the selection is cleared; nodes -4, segments -3 | nowhere | - |
| select | over a node | selection: the hovered node and others; straight segment | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete N nodes`; the selection is cleared; nodes -5, segments -3 | nowhere | - |
| select | over a node | selection: nothing; no parallel segments; straight segment | Ctrl+RMB or RMB | delete node | step `delete node`; nodes -2, segments -1 | control hints panel | no |
| select | over a node | selection: only one other node; only the hovered node; other nodes, not the hovered one; no parallel segments; straight segment | Ctrl+RMB or RMB | delete node | step `delete node`; the selection is cleared; nodes -2, segments -1 | control hints panel | no |
| select | over a node | selection: the hovered node and others; no parallel segments | Ctrl+RMB or RMB | delete selected nodes | step `delete N nodes`; the selection is cleared; nodes -5, segments -4 | control hints panel | no |
| select | over a node | selection: nothing; parallel segments | Ctrl+RMB or RMB | delete node | step `delete node`; nodes -1, segments -1 | control hints panel | no |
| select | over a node | selection: only one other node; only the hovered node; other nodes, not the hovered one; parallel segments | Ctrl+RMB or RMB | delete node | step `delete node`; the selection is cleared; nodes -1, segments -1 | control hints panel | no |
| select | over a node | selection: the hovered node and others; parallel segments | Ctrl+RMB or RMB | delete selected nodes | step `delete N nodes`; the selection is cleared; nodes -4, segments -3 | control hints panel | no |
| select | over a node | selection: the hovered node and others; straight segment | Ctrl+RMB or RMB | delete selected nodes | step `delete N nodes`; the selection is cleared; nodes -5, segments -3 | control hints panel | no |
| select | over an end radius point | selection: something selected | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `change radius` | nowhere | - |
| select | over an end radius point | - | Ctrl+LMB drag | change radius | step `change radius` | control hints panel | no |
| select | over an end radius point | selection: nothing selected | LMB drag | change radius | - | control hints panel | no |
| select | over an end radius point | selection: something selected | LMB drag | change radius | step `change radius` | control hints panel | no |
| select | over the mid radius point | selection: nothing selected; parallel segments | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `change radius` | nowhere | - |
| select | over the mid radius point | selection: something selected | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `change radius` | nowhere | - |
| select | over the mid radius point | selection: nothing selected; no parallel segments | Ctrl+LMB drag or LMB drag | change radius | - | control hints panel | no |
| select | over the mid radius point | selection: nothing selected; parallel segments | Ctrl+LMB drag or LMB drag | change radius | step `change radius` | control hints panel | no |
| select | over the mid radius point | selection: something selected | Ctrl+LMB drag or LMB drag | change radius | step `change radius` | control hints panel | no |
| select | over a segment | selection: part of the hovered segment (one node); parallel segments | Alt+LMB | select branch | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: both nodes of the hovered segment; straight segment | Alt+LMB | deselect branch | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; no parallel segments | Alt+LMB | deselect branch | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; parallel segments; straight segment | Alt+LMB | deselect branch | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a segment | selection: both nodes of the hovered segment; parallel segments | Alt+LMB | select branch | step `select node`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: part of the hovered segment (one node); no parallel segments; straight segment | Alt+LMB | select branch | step `select node`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: other nodes | Alt+LMB | select branch | step `select N nodes`; the selection is replaced | control hints panel | yes |
| select | over a segment | selection: both nodes of the hovered segment; straight segment | Alt+Shift+LMB | deselect branch | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; no parallel segments | Alt+Shift+LMB | deselect branch | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; parallel segments; straight segment | Alt+Shift+LMB | deselect branch | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a segment | selection: both nodes of the hovered segment; parallel segments | Alt+Shift+LMB | add branch to selection | step `select node`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: part of the hovered segment (one node); no parallel segments; straight segment | Alt+Shift+LMB | add branch to selection | step `select node`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: part of the hovered segment (one node); parallel segments | Alt+Shift+LMB | add branch to selection | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: other nodes | Alt+Shift+LMB | add branch to selection | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: nothing | Alt+Shift+LMB or Shift+LMB | - | step `select N nodes`; nodes are added to the selection | nowhere | - |
| select | over a segment | selection: nothing | Ctrl+LMB or LMB | select segment | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: part of the hovered segment (one node) | Ctrl+LMB or LMB | select segment instead | step `select node`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: other nodes | Ctrl+LMB or LMB | select segment instead | step `select N nodes`; the selection is replaced | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; parallel segments | Ctrl+LMB or LMB | select segment instead | step `deselect node`; nodes are removed from the selection | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; straight segment | Shift+LMB | deselect segment | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; no parallel segments | Shift+LMB | deselect segment | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a segment | selection: both nodes of the hovered segment; parallel segments; straight segment | Shift+LMB | deselect segment | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a segment | selection: part of the hovered segment (one node) | Shift+LMB | add segment to selection | step `select node`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: other nodes | Shift+LMB | add segment to selection | step `select N nodes`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; parallel segments | Shift+LMB | deselect segment | step `deselect N nodes`; nodes are removed from the selection | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; other nodes; part of the hovered segment (one node); no parallel segments; parallel segments | Alt+LMB drag | - | step `deselect all`; the selection is cleared | nowhere | - |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); straight segment | Alt+LMB drag | - | step `select node`; the selection becomes the hovered node | nowhere | - |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; straight segment | Alt+LMB drag | - | step `deselect node`; the selection becomes the hovered node | nowhere | - |
| select | over a segment | selection: nothing; straight segment | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `select node`; the selection becomes the hovered node | nowhere | - |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); straight segment | Alt+Shift+LMB drag | - | step `select node`; nodes are added to the selection | nowhere | - |
| select | over a segment | selection: nothing; no parallel segments; parallel segments | Ctrl+LMB drag or LMB drag | select | - | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; other nodes; part of the hovered segment (one node); no parallel segments; parallel segments | Ctrl+LMB drag or LMB drag | select | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over a segment | selection: nothing; other nodes; part of the hovered segment (one node); straight segment | Ctrl+LMB drag or LMB drag | select | step `select node`; the selection becomes the hovered node | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; straight segment | Ctrl+LMB drag or LMB drag | select | step `deselect node`; the selection becomes the hovered node | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; straight segment | Shift+LMB drag | add to selection | - | control hints panel | yes |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; other nodes; part of the hovered segment (one node); no parallel segments; parallel segments | Shift+LMB drag | add to selection | - | control hints panel | yes |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); straight segment | Shift+LMB drag | add to selection | step `select node`; nodes are added to the selection | control hints panel | yes |
| select | over a segment | selection: nothing; no parallel segments; straight segment | Alt+RMB | remove branch | step `remove branch`; nodes -2, segments -1 | control hints panel | no |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); no parallel segments; straight segment | Alt+RMB | remove branch | step `remove branch`; the selection is cleared; nodes -2, segments -1 | control hints panel | no |
| select | over a segment | selection: nothing; parallel segments | Alt+RMB | remove branch | step `remove branch`; nodes -3, segments -2 | control hints panel | no |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); parallel segments | Alt+RMB | remove branch | step `remove branch`; the selection is cleared; nodes -3, segments -2 | control hints panel | no |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; no parallel segments; straight segment | Alt+RMB or Ctrl+RMB or RMB | delete selected nodes | step `delete N nodes`; the selection is cleared; nodes -2, segments -1 | control hints panel | no |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; parallel segments | Alt+RMB or Ctrl+RMB or RMB | delete selected nodes | step `delete N nodes`; the selection is cleared; nodes -3, segments -2 | control hints panel | no |
| select | over a segment | selection: nothing; no parallel segments; straight segment | Alt+Shift+RMB | - | step `remove branch`; nodes -2, segments -1 | nowhere | - |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); no parallel segments; straight segment | Alt+Shift+RMB | - | step `remove branch`; the selection is cleared; nodes -2, segments -1 | nowhere | - |
| select | over a segment | selection: nothing; parallel segments | Alt+Shift+RMB | - | step `remove branch`; nodes -3, segments -2 | nowhere | - |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); parallel segments | Alt+Shift+RMB | - | step `remove branch`; the selection is cleared; nodes -3, segments -2 | nowhere | - |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; no parallel segments; straight segment | Alt+Shift+RMB or Shift+RMB | - | step `delete N nodes`; the selection is cleared; nodes -2, segments -1 | nowhere | - |
| select | over a segment | selection: all of the hovered branch; both nodes of the hovered segment; parallel segments | Alt+Shift+RMB or Shift+RMB | - | step `delete N nodes`; the selection is cleared; nodes -3, segments -2 | nowhere | - |
| select | over a segment | selection: nothing; no parallel segments; straight segment | Ctrl+RMB or RMB | remove segment | step `remove segment`; nodes -2, segments -1 | control hints panel | no |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); no parallel segments; straight segment | Ctrl+RMB or RMB | remove segment | step `remove segment`; the selection is cleared; nodes -2, segments -1 | control hints panel | no |
| select | over a segment | selection: nothing; parallel segments | Ctrl+RMB or RMB | remove segment | step `remove segment`; nodes -1, segments -1 | control hints panel | no |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); parallel segments | Ctrl+RMB or RMB | remove segment | step `remove segment`; the selection is cleared; nodes -1, segments -1 | control hints panel | no |
| select | over a segment | selection: nothing; no parallel segments; straight segment | Shift+RMB | - | step `remove segment`; nodes -2, segments -1 | nowhere | - |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); no parallel segments; straight segment | Shift+RMB | - | step `remove segment`; the selection is cleared; nodes -2, segments -1 | nowhere | - |
| select | over a segment | selection: nothing; parallel segments | Shift+RMB | - | step `remove segment`; nodes -1, segments -1 | nowhere | - |
| select | over a segment | selection: other nodes; part of the hovered segment (one node); parallel segments | Shift+RMB | - | step `remove segment`; the selection is cleared; nodes -1, segments -1 | nowhere | - |
| select | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: nothing selected | Alt+LMB | - | goes to draw mode | nowhere | - |
| select | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something selected | Alt+LMB | - | step `deselect all`; the selection is cleared | nowhere | - |
| select | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: nothing selected | Ctrl+LMB or LMB | draw mode | goes to draw mode | control hints panel | no |
| select | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something selected | Ctrl+LMB or LMB | deselect all | step `deselect all`; the selection is cleared | control hints panel | no |
| select | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something selected | Alt+LMB drag | - | step `deselect all`; the selection is cleared | nowhere | - |
| select | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: nothing selected | Ctrl+LMB drag or LMB drag | select | - | control hints panel | yes |
| select | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something selected | Ctrl+LMB drag or LMB drag | select | step `deselect all`; the selection is cleared | control hints panel | yes |
| select | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | selection: something selected | Shift+LMB drag | add to selection | - | control hints panel | yes |
| select | anywhere | selection: something selected | Esc | deselect all | step `deselect all`; the selection is cleared | control hints panel | yes |
| draw | over a bend point | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `bend curve` | nowhere | - |
| draw | over a bend point | - | Ctrl+LMB drag or LMB drag | bend curve | step `bend curve` | control hints panel | no |
| draw | over a heading control point | - | Alt+LMB | flip arm | step `flip arm` | control hints panel | no |
| draw | over a heading control point | - | Alt+Shift+LMB | - | step `flip arm` | nowhere | - |
| draw | over a heading control point | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `turn heading` | nowhere | - |
| draw | over a heading control point | - | Ctrl+LMB drag or LMB drag | turn heading | step `turn heading` | control hints panel | no |
| draw | over a node | no parallel segments; straight segment | Alt+LMB or Alt+Shift+LMB or Shift+LMB | - | step `extend road`; goes to extend mode; the selection becomes the hovered node | nowhere | - |
| draw | over a node | parallel segments | Alt+LMB or Alt+Shift+LMB or Shift+LMB | - | step `split road`; goes to extend mode; the selection becomes the hovered node | nowhere | - |
| draw | over a node | no parallel segments; straight segment | Ctrl+LMB or LMB | extend | step `extend road`; goes to extend mode; the selection becomes the hovered node | control hints panel | no |
| draw | over a node | parallel segments | Ctrl+LMB or LMB | split | step `split road`; goes to extend mode; the selection becomes the hovered node | control hints panel | no |
| draw | over a node | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `move node` | nowhere | - |
| draw | over a node | - | Ctrl+LMB drag or LMB drag | move node | step `move node` | control hints panel | no |
| draw | over a node, over a segment | - | Esc | finish | goes to select mode | control hints panel | no |
| draw | over a node | no parallel segments; straight segment | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete node`; nodes -2, segments -1 | nowhere | - |
| draw | over a node | parallel segments | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete node`; nodes -1, segments -1 | nowhere | - |
| draw | over a node | no parallel segments; straight segment | Ctrl+RMB or RMB | delete node | step `delete node`; nodes -2, segments -1 | control hints panel | no |
| draw | over a node | parallel segments | Ctrl+RMB or RMB | delete node | step `delete node`; nodes -1, segments -1 | control hints panel | no |
| draw | over an end radius point, over the mid radius point, over a segment | - | Alt+LMB or Alt+Shift+LMB or Shift+LMB | - | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| draw | over an end radius point, over the mid radius point, over a segment | - | Ctrl+LMB or LMB | split | step `split road`; goes to extend mode; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| draw | over an end radius point | - | Ctrl+LMB drag | change radius | step `change radius` | control hints panel | no |
| draw | over an end radius point | - | LMB drag | change radius | - | control hints panel | no |
| draw | over the mid radius point | parallel segments | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `change radius` | nowhere | - |
| draw | over the mid radius point | no parallel segments | Ctrl+LMB drag or LMB drag | change radius | - | control hints panel | no |
| draw | over the mid radius point | parallel segments | Ctrl+LMB drag or LMB drag | change radius | step `change radius` | control hints panel | no |
| draw | over a segment | - | Alt+LMB or Alt+Shift+LMB or Shift+LMB | - | step `extend road`; goes to extend mode; the selection becomes the hovered node | nowhere | - |
| draw | over a segment | - | LMB | extend | step `extend road`; goes to extend mode; the selection becomes the hovered node | control hints panel | no |
| draw | over a segment | no parallel segments | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `move node` | nowhere | - |
| draw | over a segment | parallel segments; straight segment | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| draw | over a segment | - | Ctrl+LMB drag | insert and set heading | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| draw | over a segment | no parallel segments | LMB drag | move node | step `move node` | control hints panel | no |
| draw | over a segment | parallel segments; straight segment | LMB drag | insert and set heading | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| draw | over a segment | parallel segments | Alt+RMB | remove branch | step `remove branch`; nodes -3, segments -2 | control hints panel | no |
| draw | over a segment | straight segment | Alt+RMB | remove branch | step `remove branch`; nodes -2, segments -1 | control hints panel | no |
| draw | over a segment | no parallel segments | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete node`; nodes -2, segments -1 | nowhere | - |
| draw | over a segment | parallel segments | Alt+Shift+RMB | - | step `remove branch`; nodes -3, segments -2 | nowhere | - |
| draw | over a segment | straight segment | Alt+Shift+RMB | - | step `remove branch`; nodes -2, segments -1 | nowhere | - |
| draw | over a segment | no parallel segments; straight segment | Ctrl+RMB | remove segment | step `remove segment`; nodes -2, segments -1 | control hints panel | no |
| draw | over a segment | parallel segments | Ctrl+RMB or RMB | remove segment | step `remove segment`; nodes -1, segments -1 | control hints panel | no |
| draw | over a segment | no parallel segments | RMB | delete node | step `delete node`; nodes -2, segments -1 | control hints panel | no |
| draw | over a segment | straight segment | RMB | remove segment | step `remove segment`; nodes -2, segments -1 | control hints panel | no |
| draw | over a segment | parallel segments | Shift+RMB | - | step `remove segment`; nodes -1, segments -1 | nowhere | - |
| draw | over a segment | straight segment | Shift+RMB | - | step `remove segment`; nodes -2, segments -1 | nowhere | - |
| draw | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Alt+LMB or Alt+Shift+LMB or Shift+LMB | - | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | nowhere | - |
| draw | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Ctrl+LMB or LMB | add node | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| draw | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | nowhere | - |
| draw | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Ctrl+LMB drag or LMB drag | add node and set heading | step `place node`; goes to extend mode; nodes are added to the selection; nodes +1, segments 0 | control hints panel | no |
| draw | over the void, over a heading control point, over an end radius point, over the mid radius point, over a bend point, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Esc | finish | goes to select mode | control hints panel | no |
| draw | over the void, over a heading control point, over an end radius point, over the mid radius point, over a bend point, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | goes to select mode | nowhere | - |
| draw | over the void, over a heading control point, over an end radius point, over the mid radius point, over a bend point, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Ctrl+RMB or RMB | finish | goes to select mode | control hints panel | no |
| extend | over a bend point | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `bend curve` | nowhere | - |
| extend | over a bend point | - | Ctrl+LMB drag or LMB drag | bend curve | step `bend curve` | control hints panel | no |
| extend | over a heading control point | - | Alt+LMB | flip arm | step `flip arm` | control hints panel | no |
| extend | over a heading control point | - | Alt+Shift+LMB | - | step `flip arm` | nowhere | - |
| extend | over a heading control point | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `turn heading` | nowhere | - |
| extend | over a heading control point | - | Ctrl+LMB drag or LMB drag | turn heading | step `turn heading` | control hints panel | no |
| extend | over a node | no parallel segments | Alt+LMB or Alt+Shift+LMB or Shift+LMB | - | step `close road`; goes to draw mode; nodes 0, segments +1 | nowhere | - |
| extend | over a node | parallel segments; straight segment | Alt+LMB or Alt+Shift+LMB or Shift+LMB | - | step `merge road`; goes to draw mode; nodes 0, segments +1 | nowhere | - |
| extend | over a node | no parallel segments | Ctrl+LMB or LMB | close | step `close road`; goes to draw mode; nodes 0, segments +1 | control hints panel | no |
| extend | over a node | parallel segments; straight segment | Ctrl+LMB or LMB | merge | step `merge road`; goes to draw mode; nodes 0, segments +1 | control hints panel | no |
| extend | over a node | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `move node` | nowhere | - |
| extend | over a node | - | Ctrl+LMB drag or LMB drag | move node | step `move node` | control hints panel | no |
| extend | over a node, over a segment | - | Esc | finish | goes to select mode | control hints panel | no |
| extend | over a node | no parallel segments; parallel segments | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete node`; nodes -1, segments -1 | nowhere | - |
| extend | over a node | straight segment | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete node`; nodes -2, segments -1 | nowhere | - |
| extend | over a node | no parallel segments; parallel segments | Ctrl+RMB or RMB | delete node | step `delete node`; nodes -1, segments -1 | control hints panel | no |
| extend | over a node | straight segment | Ctrl+RMB or RMB | delete node | step `delete node`; nodes -2, segments -1 | control hints panel | no |
| extend | over an end radius point, over the mid radius point, over a segment | - | Alt+LMB or Alt+Shift+LMB or Shift+LMB | - | step `merge road`; goes to draw mode; nodes +1, segments +2 | nowhere | - |
| extend | over an end radius point, over the mid radius point, over a segment | - | Ctrl+LMB or LMB | merge | step `merge road`; goes to draw mode; nodes +1, segments +2 | control hints panel | no |
| extend | over an end radius point | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `change radius` | nowhere | - |
| extend | over an end radius point | - | Ctrl+LMB drag or LMB drag | change radius | step `change radius` | control hints panel | no |
| extend | over the mid radius point | parallel segments | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `change radius` | nowhere | - |
| extend | over the mid radius point | no parallel segments | Ctrl+LMB drag or LMB drag | change radius | - | control hints panel | no |
| extend | over the mid radius point | parallel segments | Ctrl+LMB drag or LMB drag | change radius | step `change radius` | control hints panel | no |
| extend | over a segment | - | Alt+LMB or Alt+Shift+LMB or Shift+LMB | - | step `close road`; goes to draw mode; nodes 0, segments +1 | nowhere | - |
| extend | over a segment | - | LMB | close | step `close road`; goes to draw mode; nodes 0, segments +1 | control hints panel | no |
| extend | over a segment | no parallel segments | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `move node` | nowhere | - |
| extend | over a segment | parallel segments; straight segment | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| extend | over a segment | - | Ctrl+LMB drag | insert and set heading | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| extend | over a segment | no parallel segments | LMB drag | move node | step `move node` | control hints panel | no |
| extend | over a segment | parallel segments; straight segment | LMB drag | insert and set heading | step `insert node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| extend | over a segment | parallel segments | Alt+RMB | remove branch | step `remove branch`; nodes -3, segments -2 | control hints panel | no |
| extend | over a segment | straight segment | Alt+RMB | remove branch | step `remove branch`; nodes -2, segments -1 | control hints panel | no |
| extend | over a segment | no parallel segments | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | step `delete node`; nodes -1, segments -1 | nowhere | - |
| extend | over a segment | parallel segments | Alt+Shift+RMB | - | step `remove branch`; nodes -3, segments -2 | nowhere | - |
| extend | over a segment | straight segment | Alt+Shift+RMB | - | step `remove branch`; nodes -2, segments -1 | nowhere | - |
| extend | over a segment | no parallel segments; parallel segments | Ctrl+RMB | remove segment | step `remove segment`; nodes -1, segments -1 | control hints panel | no |
| extend | over a segment | straight segment | Ctrl+RMB or RMB | remove segment | step `remove segment`; nodes -2, segments -1 | control hints panel | no |
| extend | over a segment | no parallel segments | RMB | delete node | step `delete node`; nodes -1, segments -1 | control hints panel | no |
| extend | over a segment | parallel segments | RMB | remove segment | step `remove segment`; nodes -1, segments -1 | control hints panel | no |
| extend | over a segment | parallel segments | Shift+RMB | - | step `remove segment`; nodes -1, segments -1 | nowhere | - |
| extend | over a segment | straight segment | Shift+RMB | - | step `remove segment`; nodes -2, segments -1 | nowhere | - |
| extend | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Alt+LMB or Alt+Shift+LMB or Shift+LMB | - | step `place node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| extend | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Ctrl+LMB or LMB | add node | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| extend | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Alt+LMB drag or Alt+Shift+LMB drag or Shift+LMB drag | - | step `place node`; nodes are added to the selection; nodes +1, segments +1 | nowhere | - |
| extend | over the void, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Ctrl+LMB drag or LMB drag | add node and set heading | step `place node`; nodes are added to the selection; nodes +1, segments +1 | control hints panel | no |
| extend | over the void, over a heading control point, over an end radius point, over the mid radius point, over a bend point, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Esc | finish | goes to select mode | control hints panel | no |
| extend | over the void, over a heading control point, over an end radius point, over the mid radius point, over a bend point, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Alt+RMB or Alt+Shift+RMB or Shift+RMB | - | goes to draw mode | nowhere | - |
| extend | over the void, over a heading control point, over an end radius point, over the mid radius point, over a bend point, over the void (not snapped), over the void (on a snap line without a heading), over the void (on a snap line with a heading) | - | Ctrl+RMB or RMB | finish | goes to draw mode | control hints panel | no |
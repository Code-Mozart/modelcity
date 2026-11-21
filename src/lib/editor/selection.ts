/**
 * The selection (^1257): a set of node ids, in the order they were picked. Every function gives a
 * new set and leaves its argument alone, so that a selection can be kept in a history step. The
 * rules are those of `main` (^70 to ^75, ^557, ^684 to ^692) on a set; the nodes are found by
 * `map/hit.ts`, and a selection can be larger than a list could be searched.
 */
export type Selection = ReadonlySet<number>;

export const NOTHING: Selection = new Set();

export const sameSelection = (a: Selection, b: Selection) =>
  a.size === b.size && [...a].every((id) => b.has(id));

/** The selection with the nodes added; nodes that are selected already keep their place. */
export const withNodes = (sel: Selection, ids: Iterable<number>): Selection =>
  new Set([...sel, ...ids]);

export const withoutNodes = (sel: Selection, ids: Iterable<number>): Selection => {
  const gone = new Set(ids);
  return new Set([...sel].filter((id) => !gone.has(id)));
};

const allIn = (sel: Selection, ids: number[]) => ids.length > 0 && ids.every((id) => sel.has(id));

/** A click on a node (^71, ^72): selects just it; with Shift it is added, or taken out if it is selected. */
export function afterNodeClick(sel: Selection, id: number, shift: boolean): Selection {
  if (!shift) return sel.size === 1 && sel.has(id) ? sel : new Set([id]);
  return sel.has(id) ? withoutNodes(sel, [id]) : withNodes(sel, [id]);
}

/** A click on a segment (^74): selects its two nodes; with Shift they are added, or, if both are selected already, taken out. */
export function afterSegmentClick(sel: Selection, nodes: number[], shift: boolean): Selection {
  if (!shift) return new Set(nodes);
  return allIn(sel, nodes) ? withoutNodes(sel, nodes) : withNodes(sel, nodes);
}

/** A click on nothing (^75, ^684): deselects all; with Shift the selection stays. */
export const afterVoidClick = (sel: Selection, shift: boolean): Selection =>
  shift || sel.size === 0 ? sel : NOTHING;

/**
 * A box (^495, ^685): the nodes in it are the selection, or with Shift are added to what was
 * selected when the box began (`began`), so that the selection follows the box while it is dragged.
 */
export const afterBox = (began: Selection, inside: number[], shift: boolean): Selection =>
  shift ? withNodes(began, inside) : new Set(inside);

/** Alt+click on a branch (^128): selects its nodes, or takes them out if they are all selected. */
export const afterBranchClick = (sel: Selection, nodes: number[]): Selection =>
  allIn(sel, nodes) ? withoutNodes(sel, nodes) : new Set(nodes);

/** Alt+Shift+click on a branch (^244): adds its nodes, or takes them out if they are all selected (the others stay). */
export const afterBranchAdd = (sel: Selection, nodes: number[]): Selection =>
  allIn(sel, nodes) ? withoutNodes(sel, nodes) : withNodes(sel, nodes);

export const allSelected = allIn;

const nodes = (n: number) => (n === 1 ? 'node' : `${n} nodes`);

/** The name of a step that only changed the selection (^216): `select 3 nodes`, `deselect node`, `deselect all`. */
export function selectionName(before: Selection, after: Selection): string {
  if (after.size === 0) return 'deselect all';
  const added = [...after].filter((id) => !before.has(id)).length;
  if (added > 0) return `select ${nodes(added)}`;
  return `deselect ${nodes([...before].filter((id) => !after.has(id)).length)}`;
}

/** What a step changed in the selection: the nodes it added and the nodes it took out (so that it can be undone). */
export interface SelectionDelta {
  added: number[];
  removed: number[];
}

export const deltaOf = (before: Selection, after: Selection): SelectionDelta => ({
  added: [...after].filter((id) => !before.has(id)),
  removed: [...before].filter((id) => !after.has(id)),
});

/** The selection after a delta, or, undone, before it. */
export const applyDelta = (sel: Selection, d: SelectionDelta, undo = false): Selection => {
  const [add, drop] = undo ? [d.removed, d.added] : [d.added, d.removed];
  return withNodes(withoutNodes(sel, drop), add);
};

/** What several steps, one after another, changed in the selection altogether: a node that one added and a later one took out is not in it. */
export function composeDeltas(deltas: SelectionDelta[]): SelectionDelta {
  const [added, removed] = [new Set<number>(), new Set<number>()];
  for (const d of deltas) {
    for (const id of d.removed) if (!added.delete(id)) removed.add(id);
    for (const id of d.added) if (!removed.delete(id)) added.add(id);
  }
  return { added: [...added], removed: [...removed] };
}
